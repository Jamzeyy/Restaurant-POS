import { Routes, Route, Navigate } from 'react-router-dom';
import { usePOSStore } from './store';
import { LoginScreen } from './components/LoginScreen';
import { MainLayout } from './components/MainLayout';
import { FloorPlanView } from './components/FloorPlanView';
import { OrderView } from './components/OrderView';
import { OrdersListView } from './components/OrdersListView';
import { MenuView } from './components/MenuView';
import { AnalyticsView } from './components/AnalyticsView';
import { AuditLogView } from './components/AuditLogView';
import { SettingsView } from './components/SettingsView';
import { UsersView } from './components/UsersView';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = usePOSStore(state => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/floor" replace />} />
        <Route path="floor" element={<FloorPlanView />} />
        <Route path="order/:orderId?" element={<OrderView />} />
        <Route path="orders" element={<OrdersListView />} />
        <Route path="menu" element={<MenuView />} />
        <Route path="analytics" element={<AnalyticsView />} />
        <Route path="audit" element={<AuditLogView />} />
        <Route path="users" element={<UsersView />} />
        <Route path="settings" element={<SettingsView />} />
      </Route>
    </Routes>
  );
}

export default App;

