const roomImages = {
  // Single rooms
  1: [
    "/images/rooms/single-1.jpeg",
    "/images/rooms/single-2.jpeg",
  ],

  // Twin rooms
  2: [
    "/images/rooms/twin-1.jpeg",
    "/images/rooms/twin-2.jpeg",
    "/images/rooms/twin-3.jpeg",
  ],

  // Triple rooms
  3: ["/images/rooms/triple.jpeg"],

  // Quad rooms
  4: [
    "/images/rooms/quad-1.jpeg",
    "/images/rooms/quad-2.jpeg",
  ],
};

// Cover photo assigned to each specific room.
const roomCoverImages = {
  // Twin: A101 and A102 share the first photo.
  A101: "/images/rooms/twin-1.jpeg",
  A102: "/images/rooms/twin-1.jpeg",
  A103: "/images/rooms/twin-2.jpeg",
  A104: "/images/rooms/twin-3.jpeg",

  // Single: B102 and B104 share the first photo.
  // B101 keeps its existing first photo.
  B101: "/images/rooms/single-1.jpeg",
  B102: "/images/rooms/single-1.jpeg",
  B103: "/images/rooms/single-2.jpeg",
  B104: "/images/rooms/single-1.jpeg",

  // Quad: C102 and C104 have different photos.
  C102: "/images/rooms/quad-1.jpeg",
  C104: "/images/rooms/quad-2.jpeg",
};

// All photos for the existing room-details gallery.
export function getRoomImages(capacity) {
  return roomImages[capacity] || [];
}

// Default cover photo for a room type.
// Keep this export so existing pages continue working.
export function getRoomImage(capacity) {
  return getRoomImages(capacity)[0] || null;
}

// Specific cover photo for a room card.
export function getRoomCoverImage(room) {
  if (!room) return null;

  const roomNumber = String(room.room_number ?? "")
    .trim()
    .toUpperCase();

  return roomCoverImages[roomNumber] || getRoomImage(room.capacity);
}