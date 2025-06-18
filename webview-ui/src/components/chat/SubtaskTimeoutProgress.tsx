import { memo, useState, useEffect, useRef, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Clock, Plus, Minus, X } from "lucide-react"

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
	const expiredNotifiedRef = useRef(false)

	// Track the previous taskId to detect new timeout sessions
	const prevTaskIdRef = useRef<string>()
	const prevStartTimeRef = useRef<number>()

	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentTime(Date.now())
		}, 1000)

		return () => clearInterval(interval)
	}, [])

	// Reset expired state when props change (new timeout or extension)
	useEffect(() => {
		setIsExpired(false)
		expiredNotifiedRef.current = false

		// Only reset current time for completely new timeout sessions
		// (different taskId or different startTime)
		const isNewTimeout = taskId !== prevTaskIdRef.current || startTime !== prevStartTimeRef.current

		if (isNewTimeout) {
			// For new timeouts, initialize currentTime to startTime to begin with 0 elapsed time
			setCurrentTime(startTime)
			prevTaskIdRef.current = taskId
			prevStartTimeRef.current = startTime
		}
		// For timeout extensions (same taskId, same startTime, different timeoutMs),
		// we don't reset currentTime - it continues to tick from the interval
	}, [taskId, timeoutMs, startTime])

	const elapsed = currentTime - startTime
	const remaining = Math.max(0, timeoutMs - elapsed)
	const progress = Math.min(100, (elapsed / timeoutMs) * 100)

	// Color logic: red when 5 seconds or less, light yellow when 20 seconds or less, blue otherwise
	const isUrgent = remaining <= 5000 // 5 seconds
	const isWarning = remaining <= 20000 && remaining > 5000 // 20 seconds to 5 seconds

	useEffect(() => {
		if (remaining <= 0 && !isExpired && !expiredNotifiedRef.current) {
			setIsExpired(true)
			expiredNotifiedRef.current = true
			// Notify backend that timeout has expired
			vscode.postMessage({
				type: "timeoutExpired",
				taskId,
			})
		}
	}, [remaining, isExpired, taskId])

	const formatTime = (ms: number): string => {
		const seconds = Math.ceil(ms / 1000)
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = seconds % 60

		if (minutes > 0) {
			return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
		}
		return `${seconds}s`
	}

	const formatTimeWithSign = (ms: number, negative: boolean = false): string => {
		const seconds = Math.floor(ms / 1000)
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = seconds % 60
		const sign = negative ? "-" : ""

		if (minutes > 0) {
			return `${sign}${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
		}
		return `${sign}${seconds}s`
	}

	// Hold-to-repeat functionality
	const intervalRef = useRef<NodeJS.Timeout | null>(null)
	const timeoutRef = useRef<NodeJS.Timeout | null>(null)

	const handleExtend = useCallback(
		(extensionMs: number) => {
			onExtend?.(taskId, extensionMs)
			vscode.postMessage({
				type: "extendSubtaskTimeout",
				taskId,
				extensionMs,
			})
		},
		[taskId, onExtend],
	)

	const handleReduce = useCallback(
		(reductionMs: number) => {
			// Reduce timeout by treating as negative extension
			const extensionMs = -reductionMs
			onExtend?.(taskId, extensionMs)
			vscode.postMessage({
				type: "extendSubtaskTimeout",
				taskId,
				extensionMs,
			})
		},
		[taskId, onExtend],
	)

	const startRepeating = useCallback(
		(isExtend: boolean) => {
			let tickCount = 0

			const performAction = () => {
				tickCount++
				// After 10 ticks (2 seconds), switch to 5-minute increments
				const incrementMs = tickCount > 10 ? 300000 : 60000 // 5 minutes or 1 minute

				if (isExtend) {
					handleExtend(incrementMs)
				} else {
					// For reduce, check if we have enough time left and don't go below 1 minute
					// Use a smaller increment if it would go below 1 minute
					const minRemaining = 60000 // 1 minute minimum
					if (remaining > minRemaining) {
						const maxReduction = remaining - minRemaining
						const actualReduction = Math.min(incrementMs, maxReduction)
						if (actualReduction > 0) {
							handleReduce(actualReduction)
						}
					}
				}
			}

			// Initial action
			performAction()

			// Start repeating after a delay
			timeoutRef.current = setTimeout(() => {
				intervalRef.current = setInterval(performAction, 200) // Repeat every 200ms
			}, 500) // Start repeating after 500ms hold
		},
		[handleExtend, handleReduce, remaining],
	)

	const stopRepeating = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
			timeoutRef.current = null
		}
		if (intervalRef.current) {
			clearInterval(intervalRef.current)
			intervalRef.current = null
		}
	}, [])

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			stopRepeating()
		}
	}, [stopRepeating])

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
		<>
			<div
				className={cn(
					"flex items-center gap-2 p-2 rounded-md border",
					isUrgent
						? "bg-red-500/10 border-red-500/20"
						: isWarning
							? "bg-yellow-300/20 border-yellow-400/30"
							: "bg-blue-500/10 border-blue-500/20",
					className,
				)}>
				<div className="flex items-center gap-2 flex-grow">
					<Clock
						size={16}
						className={cn(isUrgent ? "text-red-500" : isWarning ? "text-yellow-600" : "text-blue-500")}
					/>
					<div className="flex flex-col flex-grow min-w-0">
						<div className="flex items-center justify-between">
							<span className="text-sm text-vscode-foreground/70">{formatTime(elapsed)}</span>
							<span className="text-sm font-medium">{formatTimeWithSign(remaining, true)}</span>
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

				<div className="flex items-center gap-1 shrink-0">
					<Button
						variant="ghost"
						size="sm"
						onMouseDown={() => startRepeating(false)}
						onMouseUp={stopRepeating}
						onMouseLeave={stopRepeating}
						title={t("chat:timeout.reduce")}
						className="h-6 px-2 text-xs">
						<Minus size={12} />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onMouseDown={() => startRepeating(true)}
						onMouseUp={stopRepeating}
						onMouseLeave={stopRepeating}
						title={t("chat:timeout.extend")}
						className="h-6 px-2 text-xs">
						<Plus size={12} />
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
		</>
	)
}

export default memo(SubtaskTimeoutProgress)
