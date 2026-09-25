import { HashRouter, Routes, Route } from 'react-router-dom';
import { I18nProvider } from '@/i18n';
import { AppProvider } from '@/context/AppContext';
import { DashboardPage } from '@/pages/DashboardPage';
import { LogDefectPage } from '@/pages/LogDefectPage';
import { AlertDetailPage } from '@/pages/AlertDetailPage';
import { AlertsListPage } from '@/pages/AlertsListPage';
import { KnowledgeBasePage } from '@/pages/KnowledgeBasePage';
import { AuditTrailPage } from '@/pages/AuditTrailPage';
import { SettingsPage } from '@/pages/SettingsPage';

function App() {
  return (
    <I18nProvider>
      <AppProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/log-defect" element={<LogDefectPage />} />
            <Route path="/alerts" element={<AlertsListPage />} />
            <Route path="/alerts/:id" element={<AlertDetailPage />} />
            <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
            <Route path="/audit" element={<AuditTrailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </HashRouter>
      </AppProvider>
    </I18nProvider>
  );
}

export default App;
