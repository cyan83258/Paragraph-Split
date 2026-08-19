const EXTENSION_NAME = 'Paragraph Message Splitter';
const SPLIT_MARKER = 'paragraph_message_splitter';
const BUTTON_CLASS = 'paragraph_split_button';

let splitInProgress = false;

function isInsideCodeFence(text, position) {
    const fencePattern = /^ {0,3}(`{3,}|~{3,})[^\r\n]*$/gm;
    let openFence = null;
    let match;

    while ((match = fencePattern.exec(text)) !== null && match.index < position) {
        const marker = match[1];
        const markerCharacter = marker[0];

        if (openFence === null) {
            openFence = { character: markerCharacter, length: marker.length };
        } else if (openFence.character === markerCharacter && marker.length >= openFence.length) {
            openFence = null;
        }
    }

    return openFence !== null;
}

/**
 * Splits text at the paragraph boundary nearest to its character midpoint.
 * @param {string} text
 * @returns {{ first: string, second: string, splitAt: number } | null}
 */
export function splitAtNearestParagraph(text) {
    if (typeof text !== 'string' || text.length === 0) {
        return null;
    }

    const midpoint = text.length / 2;
    const separatorPattern = /\r?\n[\t ]*\r?\n+/g;
    const candidates = [];
    let match;

    while ((match = separatorPattern.exec(text)) !== null) {
        const splitAt = match.index + (match[0].length / 2);
        if (!isInsideCodeFence(text, match.index)) {
            candidates.push({ match, distance: Math.abs(splitAt - midpoint) });
        }
    }

    candidates.sort((a, b) => a.distance - b.distance || a.match.index - b.match.index);

    for (const candidate of candidates) {
        const separator = candidate.match;
        const first = text.slice(0, separator.index).trimEnd();
        const second = text.slice(separator.index + separator[0].length).trimStart();

        if (first.length > 0 && second.length > 0) {
            return { first, second, splitAt: separator.index };
        }
    }

    return null;
}

function setSingleSwipe(message, text) {
    message.swipe_id = 0;
    message.swipes = [text];
    message.swipe_info = [{
        send_date: message.send_date,
        gen_started: message.gen_started,
        gen_finished: message.gen_finished,
        extra: structuredClone(message.extra ?? {}),
    }];
}

function cleanSecondPartExtra(extra) {
    const cleaned = structuredClone(extra ?? {});
    for (const key of [
        'file', 'files', 'image', 'inline_image', 'media',
        'reasoning', 'reasoning_duration', 'reasoning_signature', 'token_count',
    ]) {
        delete cleaned[key];
    }
    return cleaned;
}

async function splitMessage(messageId) {
    const context = SillyTavern.getContext();
    const sourceMessage = context.chat[messageId];

    if (!sourceMessage || sourceMessage.is_user || sourceMessage.is_system) {
        globalThis.toastr?.warning('AI 메시지만 분리할 수 있습니다.');
        return false;
    }

    if (Array.isArray(sourceMessage.swipes) && sourceMessage.swipes.length > 1) {
        globalThis.toastr?.warning('여러 스와이프가 있는 메시지는 분리할 수 없습니다.');
        return false;
    }

    const parts = splitAtNearestParagraph(sourceMessage.mes);
    if (!parts) {
        globalThis.toastr?.warning('분리할 수 있는 문단 경계가 없습니다. 문단 사이에 빈 줄이 있어야 합니다.');
        return false;
    }

    const splitId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    sourceMessage.extra = sourceMessage.extra ?? {};
    delete sourceMessage.extra.token_count;
    sourceMessage.extra[SPLIT_MARKER] = { id: splitId, part: 1 };
    sourceMessage.mes = parts.first;
    setSingleSwipe(sourceMessage, parts.first);

    const secondMessage = structuredClone(sourceMessage);
    secondMessage.mes = parts.second;
    secondMessage.extra = cleanSecondPartExtra(sourceMessage.extra);
    secondMessage.extra[SPLIT_MARKER] = { id: splitId, part: 2 };
    setSingleSwipe(secondMessage, parts.second);

    context.chat.splice(messageId + 1, 0, secondMessage);
    await context.saveChat();
    await context.reloadCurrentChat();

    globalThis.toastr?.success(
        `메시지를 ${parts.first.length.toLocaleString()}자와 ${parts.second.length.toLocaleString()}자로 분리했습니다.`,
    );
    console.info(`[${EXTENSION_NAME}] Split message #${messageId} into ${parts.first.length} and ${parts.second.length} characters.`);
    return true;
}

function installSplitButtons() {
    const targets = $('#message_template .extraMesButtons, #chat .mes .extraMesButtons');

    targets.each(function () {
        const container = $(this);
        if (container.children(`.${BUTTON_CLASS}`).length > 0) {
            return;
        }

        const button = $('<div>')
            .addClass(`mes_button ${BUTTON_CLASS}`)
            .text('½')
            .attr('title', '문단 기준으로 두 메시지로 분리')
            .attr('aria-label', '문단 기준으로 두 메시지로 분리');

        container.prepend(button);
    });
}

async function onSplitButtonClick(event) {
    event.preventDefault();
    event.stopPropagation();

    if (splitInProgress) {
        return;
    }

    if (document.body.dataset.generating === 'true') {
        globalThis.toastr?.warning('답변 생성이 끝난 뒤 메시지를 분리해 주세요.');
        return;
    }

    const messageElement = $(event.currentTarget).closest('.mes');
    const messageId = Number(messageElement.attr('mesid'));
    if (!Number.isInteger(messageId)) {
        globalThis.toastr?.error('메시지 번호를 확인할 수 없습니다.');
        return;
    }

    splitInProgress = true;
    $(event.currentTarget).addClass('disabled');
    try {
        await splitMessage(messageId);
    } catch (error) {
        console.error(`[${EXTENSION_NAME}] Failed to split message #${messageId}.`, error);
        globalThis.toastr?.error('메시지를 분리하는 중 오류가 발생했습니다.');
    } finally {
        splitInProgress = false;
        $(event.currentTarget).removeClass('disabled');
    }
}

jQuery(() => {
    installSplitButtons();
    $(document).on('click', `.${BUTTON_CLASS}`, onSplitButtonClick);

    const chat = document.getElementById('chat');
    if (chat) {
        new MutationObserver(installSplitButtons).observe(chat, { childList: true });
    }

    console.info(`[${EXTENSION_NAME}] Loaded in manual button mode.`);
});
