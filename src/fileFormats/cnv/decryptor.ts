import { encode } from 'iconv-lite'

const textDecoder = new TextDecoder('windows-1250')

const HEADER_PATTERN = /^{<(?<direction>[CD]):(?<movement>\d+)>}/i

type Direction = 'C' | 'D'
type Header = {
    length: number
    direction: Direction
    movement: number
}

export const parseHeader = (content: string): Header | null => {
    const match = HEADER_PATTERN.exec(content)
    if (match == null || match.groups === undefined) {
        return null
    }

    const { direction, movement } = match.groups
    return {
        length: match[0].length,
        direction: direction.toUpperCase() as Direction,
        movement: parseInt(movement, 10),
    }
}

const calcShift = (step: number, movement: number): { step: number; shift: number } => {
    const newStep = (step % movement) + 1
    const currentShift = Math.ceil(newStep / 2)
    const isOddStep = newStep % 2 !== 0
    const finalShift = isOddStep ? -currentShift : currentShift
    return {
        step: newStep,
        shift: finalShift,
    }
}

const encodeIfNeeded = (content: ArrayBuffer | string) =>
    typeof content === 'string' ? encode(content, 'windows1250') : content

export const decryptCNV = (content: ArrayBuffer | string): string => {
    const buffer = encodeIfNeeded(content)
    const contentText = textDecoder.decode(buffer)
    const header = parseHeader(contentText)
    if (header === null) {
        return contentText
    }

    const { length, direction, movement } = header
    const directionMultiplier = direction === 'D' ? -1 : 1
    const payload = new Uint8Array(buffer.slice(length))

    let output = ''
    let step = 0
    let shift = 0

    const decodingBuffer = new Uint8Array(1)
    for (let pos = 0; pos < payload.byteLength; pos++) {
        if (textDecoder.decode(payload.slice(pos, pos + 3)) === '<E>') {
            output += '\r\n'
            pos += 2
        } else if (textDecoder.decode(payload.slice(pos, pos + 2)) === '\r\n') {
            pos += 1
        } else {
            const newShift = calcShift(step, movement)
            step = newShift.step
            shift = newShift.shift

            decodingBuffer[0] = payload[pos] + ((shift * directionMultiplier) % 256)
            output += textDecoder.decode(decodingBuffer)
        }
    }

    return output
}
