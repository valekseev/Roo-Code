export interface TimeoutConfig {
	timeoutMs: number
	warningMs?: number
	onTimeout: (taskId: string) => void
	onWarning?: (taskId: string, remainingMs: number) => void
	onExtended?: (taskId: string, newTimeoutMs: number) => void
	onCleared?: (taskId: string) => void
}

export interface TimeoutStatus {
	taskId: string
	startTime: number
	timeoutMs: number
	warningMs?: number
	hasWarned: boolean
	isActive: boolean
}

export class SubtaskTimeoutManager {
	private timeouts: Map<string, NodeJS.Timeout> = new Map()
	private warnings: Map<string, NodeJS.Timeout> = new Map()
	private statuses: Map<string, TimeoutStatus> = new Map()

	startTimeout(taskId: string, config: TimeoutConfig): void {
		this.clearTimeout(taskId)

		const status: TimeoutStatus = {
			taskId,
			startTime: Date.now(),
			timeoutMs: config.timeoutMs,
			warningMs: config.warningMs,
			hasWarned: false,
			isActive: true,
		}

		this.statuses.set(taskId, status)

		if (config.warningMs && config.onWarning) {
			const warningTimeout = setTimeout(() => {
				const currentStatus = this.statuses.get(taskId)
				if (currentStatus && currentStatus.isActive && !currentStatus.hasWarned) {
					currentStatus.hasWarned = true
					const remainingMs = Math.max(0, config.timeoutMs - config.warningMs!)
					config.onWarning!(taskId, remainingMs)
				}
			}, config.warningMs)

			this.warnings.set(taskId, warningTimeout)
		}

		const timeoutHandle = setTimeout(() => {
			const currentStatus = this.statuses.get(taskId)
			if (currentStatus && currentStatus.isActive) {
				currentStatus.isActive = false
				this.clearTimeout(taskId)
				config.onTimeout(taskId)
			}
		}, config.timeoutMs)

		this.timeouts.set(taskId, timeoutHandle)
	}

	extendTimeout(taskId: string, extensionMs: number, config?: TimeoutConfig): boolean {
		const status = this.statuses.get(taskId)
		if (!status || !status.isActive) {
			return false
		}

		this.clearTimeout(taskId)

		const elapsed = Date.now() - status.startTime
		const newTimeoutMs = status.timeoutMs + extensionMs
		const remainingWarningMs = status.warningMs ? Math.max(0, status.warningMs - elapsed) : undefined

		const newStatus: TimeoutStatus = {
			...status,
			timeoutMs: newTimeoutMs,
			hasWarned: elapsed >= (status.warningMs || Infinity),
		}

		this.statuses.set(taskId, newStatus)

		if (config) {
			const adjustedConfig: TimeoutConfig = {
				...config,
				timeoutMs: newTimeoutMs - elapsed,
				warningMs: remainingWarningMs,
			}

			this.startTimeout(taskId, adjustedConfig)
			config.onExtended?.(taskId, newTimeoutMs)
		}

		return true
	}

	clearTimeout(taskId: string): boolean {
		const timeoutHandle = this.timeouts.get(taskId)
		const warningHandle = this.warnings.get(taskId)
		const status = this.statuses.get(taskId)

		if (timeoutHandle) {
			clearTimeout(timeoutHandle)
			this.timeouts.delete(taskId)
		}

		if (warningHandle) {
			clearTimeout(warningHandle)
			this.warnings.delete(taskId)
		}

		if (status) {
			status.isActive = false
			this.statuses.delete(taskId)
			return true
		}

		return false
	}

	getTimeRemaining(taskId: string): number {
		const status = this.statuses.get(taskId)
		if (!status || !status.isActive) {
			return 0
		}

		const elapsed = Date.now() - status.startTime
		return Math.max(0, status.timeoutMs - elapsed)
	}

	getStatus(taskId: string): TimeoutStatus | undefined {
		return this.statuses.get(taskId)
	}

	isActive(taskId: string): boolean {
		const status = this.statuses.get(taskId)
		return status?.isActive ?? false
	}

	getActiveTimeouts(): string[] {
		return Array.from(this.statuses.entries())
			.filter(([, status]) => status.isActive)
			.map(([taskId]) => taskId)
	}

	dispose(): void {
		for (const timeoutHandle of this.timeouts.values()) {
			clearTimeout(timeoutHandle)
		}
		for (const warningHandle of this.warnings.values()) {
			clearTimeout(warningHandle)
		}
		this.timeouts.clear()
		this.warnings.clear()
		this.statuses.clear()
	}
}
