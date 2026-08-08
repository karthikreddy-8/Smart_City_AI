"""
Tracking Service – ByteTrack / Centroid object tracking for persistent vehicle ID assignment
and unique throughput counting without double-counting.
"""
import math
import time
from typing import List, Tuple, Dict, Any


class ByteTrackerService:
    """
    Object tracking service providing persistent tracking IDs across video frames.
    Uses IoU and Euclidean centroid distance matching.
    """

    def __init__(self, max_disappeared: int = 15, max_distance: float = 85.0):
        self.next_object_id = 1
        self.objects: Dict[int, Tuple[int, int]] = {}  # object_id -> (cx, cy)
        self.disappeared: Dict[int, int] = {}          # object_id -> count of consecutive missed frames
        self.bbox_history: Dict[int, Tuple[int, int, int, int]] = {} # object_id -> (x1, y1, x2, y2)
        self.unique_tracked_ids = set()                # Set of all unique vehicle IDs seen
        self.max_disappeared = max_disappeared
        self.max_distance = max_distance

    def register(self, centroid: Tuple[int, int], bbox: Tuple[int, int, int, int]) -> int:
        """Register a new object with next available ID."""
        object_id = self.next_object_id
        self.objects[object_id] = centroid
        self.disappeared[object_id] = 0
        self.bbox_history[object_id] = bbox
        self.unique_tracked_ids.add(object_id)
        self.next_object_id += 1
        return object_id

    def deregister(self, object_id: int):
        """Deregister an object that has disappeared."""
        if object_id in self.objects:
            del self.objects[object_id]
        if object_id in self.disappeared:
            del self.disappeared[object_id]
        if object_id in self.bbox_history:
            del self.bbox_history[object_id]

    def update(self, input_boxes: List[Tuple[int, int, int, int, str, float]]) -> List[Tuple[int, int, int, int, str, float, int]]:
        """
        Update tracker with new frame detections.
        input_boxes: List of (x1, y1, x2, y2, label, confidence)
        Returns: List of (x1, y1, x2, y2, label, confidence, track_id)
        """
        if len(input_boxes) == 0:
            # Mark all existing objects as disappeared
            for object_id in list(self.disappeared.keys()):
                self.disappeared[object_id] += 1
                if self.disappeared[object_id] > self.max_disappeared:
                    self.deregister(object_id)
            return []

        input_centroids = [
            ((box[0] + box[2]) // 2, (box[1] + box[3]) // 2)
            for box in input_boxes
        ]

        if len(self.objects) == 0:
            # Register all initial objects
            results = []
            for i, box in enumerate(input_boxes):
                track_id = self.register(input_centroids[i], (box[0], box[1], box[2], box[3]))
                results.append((box[0], box[1], box[2], box[3], box[4], box[5], track_id))
            return results

        # Match existing centroids to new centroids by distance
        object_ids = list(self.objects.keys())
        object_centroids = list(self.objects.values())

        # Distance matrix
        distances = []
        for oc in object_centroids:
            row = []
            for ic in input_centroids:
                dist = math.hypot(oc[0] - ic[0], oc[1] - ic[1])
                row.append(dist)
            distances.append(row)

        used_rows = set()
        used_cols = set()
        results = [None] * len(input_boxes)

        # Greedy distance matching
        matches = []
        for r_idx, row in enumerate(distances):
            for c_idx, dist in enumerate(row):
                matches.append((dist, r_idx, c_idx))
        matches.sort(key=lambda x: x[0])

        for dist, r_idx, c_idx in matches:
            if r_idx in used_rows or c_idx in used_cols:
                continue

            if dist > self.max_distance:
                continue

            object_id = object_ids[r_idx]
            self.objects[object_id] = input_centroids[c_idx]
            self.disappeared[object_id] = 0
            box = input_boxes[c_idx]
            self.bbox_history[object_id] = (box[0], box[1], box[2], box[3])

            results[c_idx] = (box[0], box[1], box[2], box[3], box[4], box[5], object_id)
            used_rows.add(r_idx)
            used_cols.add(c_idx)

        # Handle unmatched existing objects
        for r_idx, object_id in enumerate(object_ids):
            if r_idx not in used_rows:
                self.disappeared[object_id] += 1
                if self.disappeared[object_id] > self.max_disappeared:
                    self.deregister(object_id)

        # Handle new unmatched input detections
        for c_idx, box in enumerate(input_boxes):
            if c_idx not in used_cols:
                track_id = self.register(input_centroids[c_idx], (box[0], box[1], box[2], box[3]))
                results[c_idx] = (box[0], box[1], box[2], box[3], box[4], box[5], track_id)

        return [r for r in results if r is not None]

    def get_total_unique_vehicles(self) -> int:
        """Return total unique vehicles tracked so far without double-counting."""
        return len(self.unique_tracked_ids)


# Camera tracker instances
_camera_trackers: Dict[str, ByteTrackerService] = {}

def get_tracker_for_camera(camera_id: str) -> ByteTrackerService:
    if camera_id not in _camera_trackers:
        _camera_trackers[camera_id] = ByteTrackerService()
    return _camera_trackers[camera_id]
