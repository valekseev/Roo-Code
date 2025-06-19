import type { Mock } from "vitest"
import { SubtaskTimeoutManager, type TimeoutConfig } from "../SubtaskTimeoutManager"

vi.useFakeTimers()

describe("SubtaskTimeoutManager", () => {
	let manager: SubtaskTimeoutManager
	let mockOnTimeout: Mock
	let mockOnWarning: Mock

	beforeEach(() => {
		manager = new SubtaskTimeoutManager()
		mockOnTimeout = vi.fn()
		mockOnWarning = vi.fn()
	})

	afterEach(() => {
		manager.dispose()
		vi.clearAllTimers()
		vi.clearAllMocks()
	})

	describe("startTimeout", () => {
		it("should start a timeout for a task", () => {
			const config: TimeoutConfig = {
				timeoutMs: 90000, // 90 seconds - above minimum
				onTimeout: mockOnTimeout,
			}

			manager.startTimeout("task1", config)

			expect(manager.isActive("task1")).toBe(true)
			expect(manager.getTimeRemaining("task1")).toBe(90000)
		})

		it("should call onTimeout when timeout expires", () => {
			const config: TimeoutConfig = {
				timeoutMs: 90000, // 90 seconds
				onTimeout: mockOnTimeout,
			}

			manager.startTimeout("task1", config)

			vi.advanceTimersByTime(90000)

			expect(mockOnTimeout).toHaveBeenCalledWith("task1")
			expect(manager.isActive("task1")).toBe(false)
		})

		it("should call onWarning at the specified time", () => {
			const config: TimeoutConfig = {
				timeoutMs: 90000, // 90 seconds
				warningMs: 30000, // warning at 30 seconds
				onTimeout: mockOnTimeout,
				onWarning: mockOnWarning,
			}

			manager.startTimeout("task1", config)

			vi.advanceTimersByTime(30000) // advance to warning time

			expect(mockOnWarning).toHaveBeenCalledWith("task1", 60000) // 60 seconds remaining
			expect(mockOnTimeout).not.toHaveBeenCalled()
		})

		it("should replace existing timeout when starting new one for same task", () => {
			const config1: TimeoutConfig = {
				timeoutMs: 90000, // 90 seconds
				onTimeout: mockOnTimeout,
			}
			const config2: TimeoutConfig = {
				timeoutMs: 120000, // 120 seconds
				onTimeout: mockOnTimeout,
			}

			manager.startTimeout("task1", config1)
			manager.startTimeout("task1", config2)

			vi.advanceTimersByTime(90000) // advance original timeout duration
			expect(mockOnTimeout).not.toHaveBeenCalled()
			expect(manager.isActive("task1")).toBe(true)

			vi.advanceTimersByTime(30000) // advance remaining 30 seconds
			expect(mockOnTimeout).toHaveBeenCalledWith("task1")
		})
	})

	describe("extendTimeout", () => {
		it("should extend an active timeout", () => {
			const config: TimeoutConfig = {
				timeoutMs: 90000, // 90 seconds - above minimum
				onTimeout: mockOnTimeout,
				onExtended: vi.fn(),
			}

			manager.startTimeout("task1", config)
			vi.advanceTimersByTime(10000) // advance 10 seconds

			const result = manager.extendTimeout("task1", 30000, config) // extend by 30 seconds

			expect(result).toBe(true)
			expect(manager.getTimeRemaining("task1")).toBeGreaterThan(100000) // should be ~110 seconds remaining
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
			const mockOnExtended = vi.fn()
			const config: TimeoutConfig = {
				timeoutMs: 90000, // 90 seconds - above minimum
				onTimeout: mockOnTimeout,
				onExtended: mockOnExtended,
			}

			manager.startTimeout("task1", config)
			manager.extendTimeout("task1", 30000, config) // 30 seconds extension

			expect(mockOnExtended).toHaveBeenCalledWith("task1", 120000) // 90 + 30 = 120 seconds
		})

		it("should enforce minimum remaining time when extending", () => {
			const mockOnExtended = vi.fn()
			const config: TimeoutConfig = {
				timeoutMs: 90000, // 90 seconds
				onTimeout: mockOnTimeout,
				onExtended: mockOnExtended,
			}

			manager.startTimeout("task1", config)
			vi.advanceTimersByTime(85000) // advance to 5 seconds remaining

			// Try to reduce by 10 seconds (would go below 1 minute minimum)
			const result = manager.extendTimeout("task1", -10000, config)

			expect(result).toBe(true)
			// Should be adjusted to ensure 1 minute minimum
			expect(manager.getTimeRemaining("task1")).toBe(60000) // 1 minute minimum
		})
	})

	describe("clearTimeout", () => {
		it("should clear an active timeout", () => {
			const config: TimeoutConfig = {
				timeoutMs: 90000, // 90 seconds
				onTimeout: mockOnTimeout,
			}

			manager.startTimeout("task1", config)
			const result = manager.clearTimeout("task1")

			expect(result).toBe(true)
			expect(manager.isActive("task1")).toBe(false)

			vi.advanceTimersByTime(90000)
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
				timeoutMs: 90000, // 90 seconds
				onTimeout: mockOnTimeout,
			}

			manager.startTimeout("task1", config)
			vi.advanceTimersByTime(20000) // advance 20 seconds

			const remaining = manager.getTimeRemaining("task1")
			expect(remaining).toBe(70000) // 70 seconds remaining
		})

		it("should return 0 for inactive task", () => {
			const remaining = manager.getTimeRemaining("nonexistent")
			expect(remaining).toBe(0)
		})
	})

	describe("getActiveTimeouts", () => {
		it("should return list of active timeout task IDs", () => {
			const config: TimeoutConfig = {
				timeoutMs: 90000, // 90 seconds
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
				timeoutMs: 90000, // 90 seconds
				onTimeout: mockOnTimeout,
			}

			manager.startTimeout("task1", config)
			manager.startTimeout("task2", config)

			vi.advanceTimersByTime(90000) // advance full timeout duration

			const active = manager.getActiveTimeouts()
			expect(active).toHaveLength(0)
		})
	})

	describe("dispose", () => {
		it("should clear all timeouts and statuses", () => {
			const config: TimeoutConfig = {
				timeoutMs: 90000, // 90 seconds
				onTimeout: mockOnTimeout,
			}

			manager.startTimeout("task1", config)
			manager.startTimeout("task2", config)

			manager.dispose()

			expect(manager.getActiveTimeouts()).toHaveLength(0)
			expect(manager.isActive("task1")).toBe(false)
			expect(manager.isActive("task2")).toBe(false)

			vi.advanceTimersByTime(90000)
			expect(mockOnTimeout).not.toHaveBeenCalled()
		})
	})
})
