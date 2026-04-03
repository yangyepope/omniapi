type DiffType = "added" | "removed" | "modified" | "none"

export interface DiffResult {
  path: string
  type: DiffType
  oldValue?: any
  newValue?: any
}

/**
 * 递归对比两个 JSON 对象，生成路径级的差异记录
 */
export function getJsonDiff(objOld: any, objNew: any, path = ""): DiffResult[] {
  let diffs: DiffResult[] = []

  // 1. 处理非对象类型
  if (typeof objOld !== typeof objNew || (typeof objOld !== "object" || objOld === null || objNew === null)) {
    if (objOld !== objNew) {
      diffs.push({ path, type: "modified", oldValue: objOld, newValue: objNew })
    }
    return diffs
  }

  // 2. 这里的 objOld 和 objNew 都是 Object (或 Array)
  const keysOld = Object.keys(objOld)
  const keysNew = Object.keys(objNew)
  const allKeys = Array.from(new Set([...keysOld, ...keysNew]))

  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key
    const valOld = objOld[key]
    const valNew = objNew[key]

    if (!(key in objOld)) {
      diffs.push({ path: currentPath, type: "added", newValue: valNew })
    } else if (!(key in objNew)) {
      diffs.push({ path: currentPath, type: "removed", oldValue: valOld })
    } else {
      // 递归对比子项
      diffs = diffs.concat(getJsonDiff(valOld, valNew, currentPath))
    }
  }

  return diffs
}
