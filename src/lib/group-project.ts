import type { GroupMember } from './project-store'
export function groupMembers(fields: Record<string, string>, members?: GroupMember[]): GroupMember[] {
  if (members) return members
  return (fields.members || '').split(/[,，、\n]+/).map(name => name.trim()).filter(Boolean).map((name, index) => ({id:'legacy-'+index, name, avatar:'', tag:''}))
}
export function reorderMember(members: GroupMember[], index: number, direction: number) {
  const target = index + direction
  if (index < 0 || target < 0 || target >= members.length) return members
  const result = [...members]
  ;[result[index], result[target]] = [result[target], result[index]]
  return result
}
