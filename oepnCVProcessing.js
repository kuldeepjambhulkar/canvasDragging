import { addRectangle } from "./index.js";

const plannerData = {
  Walls: [
    { x1: 33, y1: 1312, x2: 1952, y2: 1312, length: 1919 },
    { x1: 34, y1: 32, x2: 1951, y2: 32, length: 1917 },
    { x1: 32, y1: 1311, x2: 32, y2: 34, length: 1277 },
    { x1: 1952, y1: 1311, x2: 1952, y2: 33, length: 1278 },
  ],
  Doors: [],
  Windows: [],
};

function centerFloorPlan(floorPlanData) {
  const { Walls, Doors = [], Windows = [] } = floorPlanData;

  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  const updateBounds = (x1, y1, x2, y2) => {
    minX = Math.min(minX, x1, x2);
    minY = Math.min(minY, y1, y2);
    maxX = Math.max(maxX, x1, x2);
    maxY = Math.max(maxY, y1, y2);
  };

  [...Walls, ...Doors, ...Windows].forEach((item) => {
    updateBounds(item.x1, item.y1, item.x2, item.y2);
  });

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const transformItem = ({ x1, y1, x2, y2, ...rest }) => ({
    x1: x1 - centerX,
    y1: y1 - centerY,
    x2: x2 - centerX,
    y2: y2 - centerY,
    ...rest,
  });

  return {
    Walls: Walls.map(transformItem),
    Doors: Doors.map(transformItem),
    Windows: Windows.map(transformItem),
    center: { x: centerX, y: centerY },
    dimensions: {
      width: maxX - minX,
      height: maxY - minY,
    },
  };
}

const centeredData = centerFloorPlan(plannerData);
addRectangle(centeredData);
