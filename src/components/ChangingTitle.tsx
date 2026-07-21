"use client"

import { useEffect, useState } from "react"


export default function ChangingTitle() {
  const texts = [
    "ARQUETIPO",
  ]
  const [showDynamic, setShowDynamic] = useState(false)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setTimeout(() => {
      setShowDynamic(true)
      texts.forEach((_, i) => {
        setTimeout(() => setIndex(i), i * 400)
      })
    }, 2400)
  }, [])

  return (
    <div className="leading-none urban">
      {showDynamic && (
        <h1
          className="urban transition-opacity duration-700 ease-in-out opacity-100"
          key={texts[index]}
        >
          {texts[index]}
        </h1>
      )}
    </div>
  )
}
