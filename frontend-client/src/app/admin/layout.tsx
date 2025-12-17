'use client'

import type { PropsWithChildren } from 'react'
import AdminShell from '../../components/admin/AdminShell'

export default function AdminLayout({ children }: PropsWithChildren) {
  return <AdminShell>{children}</AdminShell>
}
