const roomImages = {
  // Single: capacity 1
  1: [
    "/images/rooms/single-1.jpeg",
    "/images/rooms/single-2.jpeg",
  ],

  // Twin: capacity 2
  2: [
    "/images/rooms/twin-1.jpeg",
    "/images/rooms/twin-2.jpeg",
    "/images/rooms/twin-3.jpeg",
  ],

  // Triple: capacity 3
  3: [
    "/images/rooms/triple.jpeg",
  ],

  // Quad: capacity 4
  4: [
    "/images/rooms/quad-1.jpeg",
    "/images/rooms/quad-2.jpeg",
  ],
};

// All photos for the room-details gallery.
export function getRoomImages(capacity) {
  return roomImages[capacity] || [];
}

// First photo for the room-list card.
export function getRoomImage(capacity) {
  return getRoomImages(capacity)[0] || null;
}