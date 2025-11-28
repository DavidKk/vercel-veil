import crypto from 'node:crypto'

export type PeerRole = 'host' | 'guest'

export interface RoomState {
  id: string
  createdAt: number
  updatedAt: number
  expiresAt: number
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
  candidates: Record<PeerRole, RTCIceCandidateInit[]>
}

const ROOM_TTL_MS = 1000 * 60 * 30 // 30 minutes
const MAX_ROOMS = 1000

const rooms = new Map<string, RoomState>()

const cleanupExpiredRooms = () => {
  const now = Date.now()
  for (const [roomId, room] of rooms.entries()) {
    if (room.expiresAt <= now) {
      rooms.delete(roomId)
    }
  }
}

const ensureCapacity = () => {
  if (rooms.size < MAX_ROOMS) {
    return
  }

  const sortedByAge = Array.from(rooms.values()).sort((a, b) => a.updatedAt - b.updatedAt)
  const target = sortedByAge.slice(0, Math.max(1, Math.floor(MAX_ROOMS * 0.1)))
  for (const room of target) {
    rooms.delete(room.id)
  }
}

const generateRoomId = () => {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8)
}

const touchRoom = (room: RoomState) => {
  const now = Date.now()
  room.updatedAt = now
  // 延长房间过期时间，只要房间在使用中就保持有效
  room.expiresAt = now + ROOM_TTL_MS
}

export const roomStore = {
  createRoom() {
    cleanupExpiredRooms()
    ensureCapacity()

    const id = generateRoomId()
    const now = Date.now()
    const room: RoomState = {
      id,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + ROOM_TTL_MS,
      candidates: {
        host: [],
        guest: [],
      },
    }

    rooms.set(id, room)

    return room
  },
  getRoom(roomId: string) {
    cleanupExpiredRooms()
    const room = rooms.get(roomId)
    if (!room) {
      return undefined
    }
    touchRoom(room)
    return room
  },
  deleteRoom(roomId: string) {
    return rooms.delete(roomId)
  },
  setOffer(roomId: string, offer: RTCSessionDescriptionInit) {
    const room = this.getRoom(roomId)
    if (!room) {
      return undefined
    }
    room.offer = offer
    touchRoom(room)
    return room
  },
  setAnswer(roomId: string, answer: RTCSessionDescriptionInit) {
    const room = this.getRoom(roomId)
    if (!room) {
      return undefined
    }
    room.answer = answer
    touchRoom(room)
    return room
  },
  addCandidate(roomId: string, role: PeerRole, candidate: RTCIceCandidateInit) {
    const room = this.getRoom(roomId)
    if (!room) {
      return undefined
    }
    room.candidates[role].push(candidate)
    touchRoom(room)
    return room
  },
}

export type { RoomState as RoomSnapshot }
