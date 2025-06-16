import { jest } from "@jest/globals"
import { SubtaskTimeoutManager, type TimeoutConfig } from "../SubtaskTimeoutManager"

describe("SubtaskTimeoutManager", () => {
	let manager: SubtaskTimeoutManager
	let mockOnTimeout: jest.MockedFunction<(taskId: string) => void>
	let mockOnWarning: jest.MockedFunction<(taskId: string, remainingMs: number) => void>

	beforeEach(() => {
		jest.useFakeTimers()
		manager = new SubtaskTimeoutManager()
		mockOnTimeout = jest.fn()
		mockOnWarning = jest.fn()
	})

	afterEach(() => {
		manager.dispose()
		jest.useRealTimers()
	})

	describe("startTimeout", () => {
		it("should start a timeout for a task", () => {
			const config: TimeoutConfig = {
				timeoutMs: 5000,
				onTimeout: mockOnTimeout,
			}

			manager.startTimeout("task1", config)

			expect(manager.isActive("task1")).toBe(true)
			expect(manager.getTimeRemaining("task1")).toBe(5000)
		})

		it("should call onTimeout when timeout expires", () => {
			const config: TimeoutConfig = {
				timeoutMs: 5000,
				onTimeout: mockOnTimeout,
			}

			manager.startTimeout("task1", config)

			jest.advanceTimersByTime(5000)

			expect(mockOnTimeout).toHaveBeenCalledWith("task1")
			expect(manager.isActive("task1")).toBe(false)
		})

		it("should call onWarning at the specified time", () => {
			const config: TimeoutConfig = {
				timeoutMs: 5000,
				warningMs: 2000,
				onTimeout: mockOnTimeout,
				onWarning: mockOnWarning,
			}

			manager.startTimeout("task1", config)

			jest.advanceTimersByTime(2000)

			expect(mockOnWarning).toHaveBeenCalledWith("task1", 3000)
			expect(mockOnTimeout).not.toHaveBeenCalled()
		})

		it("should replace existing timeout when starting new one for same task", () => {
			const config1: TimeoutConfig = {
				timeoutMs: 5000,
				onTimeout: mockOnTimeout,
			}
			const config2: TimeoutConfig = {
				timeoutMs: 10000,
				onTimeout: mockOnTimeout,
			}

			manager.startTimeout("task1", config1)
			manager.startTimeout("task1", config2)

			jest.advanceTimersByTime(5000)
			expect(mockOnTimeout).not.toHaveBeenCalled()
			expect(manager.isActive("task1")).toBe(true)

			jest.advanceTimersByTime(5000)
			expect(mockOnTimeout).toHaveBeenCalledWith("task1")
		})
	})

	describe("extendTimeout", () => {
		it("should extend an active timeout", () => {
			const config: TimeoutConfig = {
				timeoutMs: 5000,
				onTimeout: mockOnTimeout,
				onExtended: jest.fn(),
			}

			manager.startTimeout("task1", config)
			jest.advanceTimersByTime(2000)

			const result = manager.extendTimeout("task1", 3000, config)

			expect(result).toBe(true)
			expect(manager.getTimeRemaining("task1")).toBeGreaterThan(5000)
		})

		it("should return false for inactive task", () => {
			const config: TimeoutConfig = {
				timeoutMs: 5000,
				onTimeout: mockOnTimeout,
			}

			const result = manager.extendTimeout("nonexistent", 3000, config)
			expect(result).toBe(false)
		})

		it("should call onExtended callback when extending", () => {
			const mockOnExtended = jest.fn()
			const config: TimeoutConfig = {
				timeoutMs: 5000,
				onTimeout: mockOnTimeout,
				onExtended: mockOnExtended,
			}

			manager.startTimeout("task1", config)
			manager.extendTimeout("task1", 3000, config)

			expect(mockOnExtended).toHaveBeenCalledWith("task1", 8000)
		})
	})

	describe("clearTimeout", () => {
		it("should clear an active timeout", () => {
			const config: TimeoutConfig = {
				timeoutMs: 5000,
				onTimeout: mockOnTimeout,
			}

			manager.startTimeout("task1", config)
			const result = manager.clearTimeout("task1")

			expect(result).toBe(true)
			expect(manager.isActive("task1")).toBe(false)

			jest.advanceTimersByTime(5000)
			expect(mockOnTimeout).not.toHaveBeenCalled()
		})

		it("should return false for non-existent task", () => {
			const result = manager.clearTimeout("nonexistent")
			expect(result).toBe(false)
		})
	})

	describe("getTimeRemaining", () => {
		it("should return correct remaining time", () => {
			const config: TimeoutConfig = {
				timeoutMs: 5000,
				onTimeout: mockOnTimeout,
			}

			manager.startTimeout("task1", config)
			jest.advanceTimersByTime(2000)

			const remaining = manager.getTimeRemaining("task1")
			expect(remaining).toBe(3000)
		})

		it("should return 0 for inactive task", () => {
			const remaining = manager.getTimeRemaining("nonexistent")
			expect(remaining).toBe(0)
		})
	})

	describe("getActiveTimeouts", () => {
		it("should return list of active timeout task IDs", () => {
			const config: TimeoutConfig = {
				timeoutMs: 5000,
				onTimeout: mockOnTimeout,
			}

			manager.startTimeout("task1", config)
			manager.startTimeout("task2", config)

			const active = manager.getActiveTimeouts()
			expect(active).toEqual(expect.arrayContaining(["task1", "task2"]))
			expect(active).toHaveLength(2)
		})

		it("should not include expired timeouts", () => {
			const config: TimeoutConfig = {
				timeoutMs: 5000,
				onTimeout: mockOnTimeout,
			}

			manager.startTimeout("task1", config)
			manager.startTimeout("task2", config)

			jest.advanceTimersByTime(5000)

			const active = manager.getActiveTimeouts()
			expect(active).toHaveLength(0)
		})
	})

	describe("dispose", () => {
		it("should clear all timeouts and statuses", () => {
			const config: TimeoutConfig = {
				timeoutMs: 5000,
				onTimeout: mockOnTimeout,
			}

			manager.startTimeout("task1", config)
			manager.startTimeout("task2", config)

			manager.dispose()

			expect(manager.getActiveTimeouts()).toHaveLength(0)
			expect(manager.isActive("task1")).toBe(false)
			expect(manager.isActive("task2")).toBe(false)

			jest.advanceTimersByTime(5000)
			expect(mockOnTimeout).not.toHaveBeenCalled()
		})
	})
})
