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

		// Clear existing timeout handlers but preserve the original startTime
		const timeoutHandle = this.timeouts.get(taskId)
		const warningHandle = this.warnings.get(taskId)

		if (timeoutHandle) {
			clearTimeout(timeoutHandle)
			this.timeouts.delete(taskId)
		}

		if (warningHandle) {
			clearTimeout(warningHandle)
			this.warnings.delete(taskId)
		}

		const elapsed = Date.now() - status.startTime
		const newTimeoutMs = status.timeoutMs + extensionMs
		const remainingWarningMs = status.warningMs ? Math.max(0, status.warningMs - elapsed) : undefined

		// Ensure minimum remaining time of 1 minute (60000ms)
		const minRemainingMs = 60000
		const remainingMs = newTimeoutMs - elapsed
		if (remainingMs < minRemainingMs) {
			// Adjust newTimeoutMs to ensure minimum remaining time
			const adjustedTimeoutMs = elapsed + minRemainingMs
			const actualNewTimeoutMs = adjustedTimeoutMs

			// Update with the adjusted timeout
			const newStatus: TimeoutStatus = {
				...status,
				timeoutMs: actualNewTimeoutMs,
				hasWarned: elapsed >= (status.warningMs || Infinity),
			}

			this.statuses.set(taskId, newStatus)

			if (config) {
				// Set up timeout with minimum remaining time
				const timeoutHandle = setTimeout(() => {
					const currentStatus = this.statuses.get(taskId)
					if (currentStatus && currentStatus.isActive) {
						currentStatus.isActive = false
						this.clearTimeout(taskId)
						config.onTimeout(taskId)
					}
				}, minRemainingMs)

				this.timeouts.set(taskId, timeoutHandle)
				config.onExtended?.(taskId, actualNewTimeoutMs)
			}

			return true
		}

		// Update status but keep original startTime for UI continuity
		const newStatus: TimeoutStatus = {
			...status,
			timeoutMs: newTimeoutMs,
			hasWarned: elapsed >= (status.warningMs || Infinity),
		}

		this.statuses.set(taskId, newStatus)

		if (config) {
			// Calculate remaining time from the original start time
			const remainingMs = newTimeoutMs - elapsed
			const remainingWarningMsFromStart = remainingWarningMs

			// Set up new warning timeout if needed
			if (
				remainingWarningMsFromStart &&
				remainingWarningMsFromStart > 0 &&
				config.onWarning &&
				!newStatus.hasWarned
			) {
				const warningTimeout = setTimeout(() => {
					const currentStatus = this.statuses.get(taskId)
					if (currentStatus && currentStatus.isActive && !currentStatus.hasWarned) {
						currentStatus.hasWarned = true
						const remainingMs = Math.max(
							0,
							currentStatus.timeoutMs - (Date.now() - currentStatus.startTime),
						)
						config.onWarning!(taskId, remainingMs)
					}
				}, remainingWarningMsFromStart)

				this.warnings.set(taskId, warningTimeout)
			}

			// Set up new timeout
			const timeoutHandle = setTimeout(() => {
				const currentStatus = this.statuses.get(taskId)
				if (currentStatus && currentStatus.isActive) {
					currentStatus.isActive = false
					this.clearTimeout(taskId)
					config.onTimeout(taskId)
				}
			}, remainingMs)

			this.timeouts.set(taskId, timeoutHandle)
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

	clearAll(): void {
		// Clear all active timeouts and set them as inactive
		for (const [taskId, status] of this.statuses.entries()) {
			if (status.isActive) {
				status.isActive = false
				this.clearTimeout(taskId)
			}
		}
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
