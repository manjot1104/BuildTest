import DashboardLayout from '@/components/layout/dashboard-layout'
import React from 'react'

const Layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <DashboardLayout>{children}</DashboardLayout>
    )
}

export default Layout