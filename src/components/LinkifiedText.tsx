const URL_PATTERN = /(https?:\/\/[^\s）)」』、。]+)/g

/** テキスト中の URL をリンク化して表示（改行は保持） */
export function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(URL_PATTERN)
  return (
    <span className="break-words whitespace-pre-wrap">
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-navy-600 underline decoration-navy-200 underline-offset-2 hover:decoration-navy-600"
          >
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </span>
  )
}
