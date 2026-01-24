import { useState } from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { zhCN } from "react-day-picker/locale"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function DatePickerButton(props: { onSelect: (value: string) => void; ariaLabel?: string }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Date | undefined>()

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      setSelected(date)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      props.onSelect(`${year}/${month}/${day}`)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          aria-label={props.ariaLabel ?? "选择日期"}
        >
          <CalendarIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden rounded-xl p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          locale={zhCN}
          className="rounded-xl"
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
