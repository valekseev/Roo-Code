import { memo, useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Clock, X } from "lucide-react"

import { Button } from "@src/components/ui"
import { cn } from "@src/lib/utils"
import { vscode } from "@src/utils/vscode"

export interface SubtaskTimeoutProgressProps {
	taskId: string
	timeoutMs: number
	startTime: number
	warningPercent?: number
	onExtend?: (taskId: string, extensionMs: number) => void
	onClear?: (taskId: string) => void
	className?: string
}

const SubtaskTimeoutProgress = ({
	taskId,
	timeoutMs,
	startTime,
	onExtend,
	onClear,
	className,
}: SubtaskTimeoutProgressProps) => {
	const { t } = useTranslation()
	const [currentTime, setCurrentTime] = useState(Date.now())
	const [isExpired, setIsExpired] = useState(false)

	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentTime(Date.now())
		}, 1000)

		return () => clearInterval(interval)
	}, [])

	const elapsed = currentTime - startTime
	const remaining = Math.max(0, timeoutMs - elapsed)
	const progress = Math.min(100, (elapsed / timeoutMs) * 100)

	// Color logic: red when 5 seconds or less, orange when 20 seconds or less, blue otherwise
	const isUrgent = remaining <= 5000 // 5 seconds
	const isWarning = remaining <= 20000 && remaining > 5000 // 20 seconds to 5 seconds

	useEffect(() => {
		if (remaining <= 0 && !isExpired) {
			setIsExpired(true)
		}
	}, [remaining, isExpired])

	const formatTime = (ms: number): string => {
		const seconds = Math.ceil(ms / 1000)
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = seconds % 60

		if (minutes > 0) {
			return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
		}
		return `${seconds}s`
	}

	const handleExtend1m = () => {
		const extensionMs = 60000 // 1 minute
		onExtend?.(taskId, extensionMs)
		vscode.postMessage({
			type: "extendSubtaskTimeout",
			taskId,
			extensionMs,
		})
	}

	const handleExtend10m = () => {
		const extensionMs = 600000 // 10 minutes
		onExtend?.(taskId, extensionMs)
		vscode.postMessage({
			type: "extendSubtaskTimeout",
			taskId,
			extensionMs,
		})
	}

	const handleClear = () => {
		onClear?.(taskId)
		vscode.postMessage({
			type: "clearSubtaskTimeout",
			taskId,
		})
	}

	if (remaining <= 0 && isExpired) {
		return (
			<div
				className={cn(
					"flex items-center gap-2 p-2 rounded-md bg-red-500/10 border border-red-500/20",
					className,
				)}>
				<Clock size={16} className="text-red-500" />
				<span className="text-red-500 font-medium text-sm">{t("chat:timeout.expired")}</span>
			</div>
		)
	}

	return (
		<div
			className={cn(
				"flex items-center gap-2 p-2 rounded-md border",
				isUrgent
					? "bg-red-500/10 border-red-500/20"
					: isWarning
						? "bg-orange-500/10 border-orange-500/20"
						: "bg-blue-500/10 border-blue-500/20",
				className,
			)}>
			<div className="flex items-center gap-2 flex-grow">
				<Clock
					size={16}
					className={cn(isUrgent ? "text-red-500" : isWarning ? "text-orange-500" : "text-blue-500")}
				/>
				<div className="flex flex-col flex-grow min-w-0">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">⏱️ {formatTime(remaining)} remaining</span>
					</div>
					<div className="w-full bg-vscode-panel-border rounded-full h-1.5 mt-1">
						<div
							className={cn(
								"h-1.5 rounded-full transition-all duration-1000",
								isUrgent ? "bg-red-500" : isWarning ? "bg-orange-500" : "bg-blue-500",
							)}
							style={{ width: `${progress}%` }}
						/>
					</div>
				</div>
			</div>

			<div className="flex items-center gap-1 shrink-0">
				<Button
					variant="ghost"
					size="sm"
					onClick={handleExtend1m}
					title="Extend by 1 minute"
					className="h-6 px-2 text-xs">
					+1m
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={handleExtend10m}
					title="Extend by 10 minutes"
					className="h-6 px-2 text-xs">
					+10m
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={handleClear}
					title={t("chat:timeout.clear")}
					className="h-6 px-2 text-xs">
					<X size={12} />
				</Button>
			</div>
		</div>
	)
}

export default memo(SubtaskTimeoutProgress)
