import { memo, useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Clock, Plus, X } from "lucide-react"

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
	warningPercent = 80,
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
	const isWarning = progress >= warningPercent
	const isUrgent = progress >= 95

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

	const handleExtend = () => {
		const extensionMs = Math.max(60000, Math.floor(timeoutMs * 0.5)) // Extend by 50% or 1 minute, whichever is larger
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
						? "bg-yellow-500/10 border-yellow-500/20"
						: "bg-blue-500/10 border-blue-500/20",
				className,
			)}>
			<div className="flex items-center gap-2 flex-grow">
				<Clock
					size={16}
					className={cn(isUrgent ? "text-red-500" : isWarning ? "text-yellow-500" : "text-blue-500")}
				/>
				<div className="flex flex-col flex-grow min-w-0">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">
							{t("chat:timeout.remaining")}: {formatTime(remaining)}
						</span>
						<span className="text-xs opacity-70">{progress.toFixed(0)}%</span>
					</div>
					<div className="w-full bg-vscode-panel-border rounded-full h-1.5 mt-1">
						<div
							className={cn(
								"h-1.5 rounded-full transition-all duration-1000",
								isUrgent ? "bg-red-500" : isWarning ? "bg-yellow-500" : "bg-blue-500",
							)}
							style={{ width: `${progress}%` }}
						/>
					</div>
				</div>
			</div>

			{isWarning && (
				<div className="flex items-center gap-1 shrink-0">
					<Button
						variant="ghost"
						size="sm"
						onClick={handleExtend}
						title={t("chat:timeout.extend")}
						className="h-6 px-2 text-xs">
						<Plus size={12} />
						{t("chat:timeout.extend")}
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleClear}
						title={t("chat:timeout.clear")}
						className="h-6 px-2 text-xs">
						<X size={12} />
						{t("chat:timeout.clear")}
					</Button>
				</div>
			)}
		</div>
	)
}

export default memo(SubtaskTimeoutProgress)
