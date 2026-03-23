import { toast } from 'sonner'

// ============================================================================
// OFFLINE QUEUE
// ============================================================================

interface OfflineUpdate {
	id: string
	entity: string
	entityId: string
	field: string
	value: any
	timestamp: number
}

const OFFLINE_QUEUE_KEY = 'field_management_offline_queue'

/**
 * Менеджер offline режима
 * Сохраняет изменения в localStorage когда нет интернета
 * Синхронизирует когда интернет появляется
 */
class OfflineManager {
	private queue: OfflineUpdate[] = []
	private isOnline: boolean = true
	private listeners: Set<(online: boolean) => void> = new Set()

	constructor() {
		if (typeof window !== 'undefined') {
			// НЕ запускать на публичных share страницах
			const isSharePage = window.location.pathname.startsWith('/share')
			if (isSharePage) {
				console.log('[OfflineManager] Disabled on /share page')
				return
			}

			// Загрузить очередь из localStorage
			this.loadQueue()

			// Подписаться на события online/offline
			window.addEventListener('online', this.handleOnline)
			window.addEventListener('offline', this.handleOffline)

			// Проверить текущее состояние
			this.isOnline = navigator.onLine
		}
	}

	/**
	 * Добавить слушателя изменения статуса
	 */
	addListener(listener: (online: boolean) => void) {
		this.listeners.add(listener)
	}

	/**
	 * Удалить слушателя
	 */
	removeListener(listener: (online: boolean) => void) {
		this.listeners.delete(listener)
	}

	/**
	 * Уведомить слушателей
	 */
	private notifyListeners() {
		this.listeners.forEach(listener => listener(this.isOnline))
	}

	/**
	 * Обработчик возвращения онлайн
	 */
	private handleOnline = () => {
		this.isOnline = true
		toast.success('🌐 Connection restored', {
			description: 'Syncing your changes...',
		})
		this.notifyListeners()
		this.syncQueue()
	}

	/**
	 * Обработчик ухода в оффлайн
	 */
	private handleOffline = () => {
		this.isOnline = false
		toast.warning('📡 Working offline', {
			description: 'Changes will sync when connection is restored',
			duration: Infinity, // Показывать пока не появится интернет
		})
		this.notifyListeners()
	}

	/**
	 * Проверить, онлайн ли сейчас
	 */
	getIsOnline(): boolean {
		return this.isOnline
	}

	/**
	 * Добавить изменение в очередь
	 */
	addToQueue(update: Omit<OfflineUpdate, 'id' | 'timestamp'>) {
		const offlineUpdate: OfflineUpdate = {
			...update,
			id: `${update.entity}-${update.entityId}-${update.field}-${Date.now()}`,
			timestamp: Date.now(),
		}

		this.queue.push(offlineUpdate)
		this.saveQueue()

		console.log('[OfflineManager] Added to queue:', offlineUpdate)
	}

	/**
	 * Получить размер очереди
	 */
	getQueueSize(): number {
		return this.queue.length
	}

	/**
	 * Сохранить очередь в localStorage
	 */
	private saveQueue() {
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.queue))
			} catch (error) {
				console.error('[OfflineManager] Failed to save queue:', error)
			}
		}
	}

	/**
	 * Загрузить очередь из localStorage
	 */
	private loadQueue() {
		if (typeof window !== 'undefined') {
			try {
				const stored = localStorage.getItem(OFFLINE_QUEUE_KEY)
				if (stored) {
					this.queue = JSON.parse(stored)
					console.log('[OfflineManager] Loaded queue:', this.queue.length, 'items')
				}
			} catch (error) {
				console.error('[OfflineManager] Failed to load queue:', error)
			}
		}
	}

	/**
	 * Синхронизировать очередь с сервером через Server Actions
	 */
	async syncQueue() {
		// НЕ синхронизировать на публичных share страницах
		if (typeof window !== 'undefined' && window.location.pathname.startsWith('/share')) {
			console.log('[OfflineManager] Sync disabled on /share page')
			return
		}

		if (this.queue.length === 0) {
			return
		}

		console.log('[OfflineManager] Syncing queue:', this.queue.length, 'items')

		// Импортируем Server Action динамически
		const { updateEntityAction } = await import('@/actions/update-entity')

		const errors: string[] = []
		const successful: OfflineUpdate[] = []

		for (const update of this.queue) {
			try {
				const result = await updateEntityAction({
					entity: update.entity as any,
					entityId: update.entityId,
					field: update.field,
					value: update.value,
				})

				if (result?.serverError || result?.validationErrors) {
					errors.push(`${update.entity}:${update.field}`)
					console.error('[OfflineManager] Sync error:', result.serverError || result.validationErrors)
				} else if (result?.data) {
					successful.push(update)
				}
			} catch (err) {
				errors.push(`${update.entity}:${update.field}`)
				console.error('[OfflineManager] Sync error:', err)
			}
		}

		// Удалить успешно синхронизированные
		this.queue = this.queue.filter(
			item => !successful.find(s => s.id === item.id)
		)
		this.saveQueue()

		// Показать результат
		if (successful.length > 0) {
			toast.success('✅ Changes synced', {
				description: `${successful.length} update(s) saved`,
			})
		}

		if (errors.length > 0) {
			toast.error('❌ Some changes failed to sync', {
				description: `${errors.length} update(s) failed. Will retry.`,
			})
		}
	}

	/**
	 * Очистить очередь (использовать с осторожностью!)
	 */
	clearQueue() {
		this.queue = []
		this.saveQueue()
	}

	/**
	 * Cleanup
	 */
	destroy() {
		if (typeof window !== 'undefined') {
			window.removeEventListener('online', this.handleOnline)
			window.removeEventListener('offline', this.handleOffline)
		}
		this.listeners.clear()
	}
}

// Singleton
export const offlineManager = new OfflineManager()