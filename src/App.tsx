import React, { useState, useEffect } from 'react';
import {
  auth,
  onAuthStateChanged,
  testConnection,
  type User,
} from './firebase';
import type { Report, Issue, Photo, ScreenName } from './types';
import {
  subscribeReports,
  subscribeIssues,
  subscribePhotos,
} from './services/reportService';
import { ReportsHomeScreen } from './screens/ReportsHomeScreen';
import { ReportDetailScreen } from './screens/ReportDetailScreen';
import { AddIssueScreen } from './screens/AddIssueScreen';
import { IssueDetailScreen } from './screens/IssueDetailScreen';
import { PhotoDetailScreen } from './screens/PhotoDetailScreen';

export default function App() {
  // Navigation State
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('reports_home');
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [isCreatingNewReport, setIsCreatingNewReport] = useState<boolean>(false);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Data state
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);

  // Active items
  const [activeReportIssues, setActiveReportIssues] = useState<Issue[]>([]);
  const [activeIssuePhotos, setActiveIssuePhotos] = useState<Photo[]>([]);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);

  // 1. Connection & Auth listener on mount
  useEffect(() => {
    testConnection();
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return () => unsubAuth();
  }, []);

  // 2. Subscribe to Reports collection
  useEffect(() => {
    setIsLoadingReports(true);

    const unsubscribe = subscribeReports(
      (fetchedReports) => {
        setReports(fetchedReports);
        setIsLoadingReports(false);
        setReportsError(null);
      },
      (err) => {
        console.error('Reports subscription error:', err);
        setReportsError('Failed to load reports from Firestore. Please verify your connection.');
        setIsLoadingReports(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 3. Subscribe to Issues if inside a Report
  useEffect(() => {
    if (!activeReportId) {
      setActiveReportIssues([]);
      setIsLoadingIssues(false);
      return;
    }

    setIsLoadingIssues(true);
    const unsubIssues = subscribeIssues(
      activeReportId,
      (issues) => {
        setActiveReportIssues(issues);
        setIsLoadingIssues(false);
      },
      (err) => {
        console.error('Issues subscription error:', err);
        setIsLoadingIssues(false);
      }
    );

    return () => unsubIssues();
  }, [activeReportId]);

  // 4. Subscribe to Photos if inside an Issue
  useEffect(() => {
    if (!activeReportId || !activeIssueId) {
      setActiveIssuePhotos([]);
      setIsLoadingPhotos(false);
      return;
    }

    setIsLoadingPhotos(true);
    const unsubPhotos = subscribePhotos(
      activeReportId,
      activeIssueId,
      (photos) => {
        setActiveIssuePhotos(photos);
        setIsLoadingPhotos(false);
      },
      (err) => {
        console.error('Photos subscription error:', err);
        setIsLoadingPhotos(false);
      }
    );

    return () => unsubPhotos();
  }, [activeReportId, activeIssueId]);

  // Current entity lookup
  const activeReport = reports.find((r) => r.id === activeReportId) || null;
  const activeIssue = activeReportIssues.find((i) => i.id === activeIssueId) || null;
  const activePhoto = activeIssuePhotos.find((p) => p.id === activePhotoId) || null;

  // Navigation handlers
  const handleOpenReport = (reportId: string, isNew: boolean = false) => {
    setActiveReportId(reportId);
    setIsCreatingNewReport(isNew);
    setActiveIssueId(null);
    setActivePhotoId(null);
    setCurrentScreen('report_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToAddIssue = () => {
    setActiveIssueId(null);
    setActivePhotoId(null);
    setCurrentScreen('add_issue');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenIssue = (issueId: string) => {
    setActiveIssueId(issueId);
    setActivePhotoId(null);
    setCurrentScreen('issue_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenPhoto = (photoId: string) => {
    setActivePhotoId(photoId);
    setCurrentScreen('photo_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Back navigation hierarchy per Section 22:
  // Photo Detail → Issue Detail
  // Issue Detail → Report Detail
  // Add Issue → Report Detail
  // Report Detail → Reports Home
  const handleBackToReports = () => {
    setActiveReportId(null);
    setActiveIssueId(null);
    setActivePhotoId(null);
    setCurrentScreen('reports_home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToReport = () => {
    setActiveIssueId(null);
    setActivePhotoId(null);
    setCurrentScreen('report_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToIssue = () => {
    setActivePhotoId(null);
    setCurrentScreen('issue_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Screen 1: Reports Home */}
      {currentScreen === 'reports_home' && (
        <ReportsHomeScreen
          reports={reports}
          isLoading={isLoadingReports}
          error={reportsError}
          currentUser={currentUser}
          onOpenReport={handleOpenReport}
        />
      )}

      {/* Screen 2: Report Detail */}
      {currentScreen === 'report_detail' && activeReport && (
        <ReportDetailScreen
          report={activeReport}
          isNewReport={isCreatingNewReport}
          onBack={handleBackToReports}
          onOpenIssue={handleOpenIssue}
          onNavigateToAddIssue={handleNavigateToAddIssue}
          onReportSaved={() => {
            setIsCreatingNewReport(false);
            handleNavigateToAddIssue();
          }}
          onReportDeleted={handleBackToReports}
        />
      )}

      {/* Screen 3: Add Issue (Separate Page) */}
      {currentScreen === 'add_issue' && activeReport && (
        <AddIssueScreen
          report={activeReport}
          onBack={handleBackToReport}
          onIssueCreated={(newIssueId) => {
            handleOpenIssue(newIssueId);
          }}
        />
      )}

      {/* Screen 4: Issue Detail */}
      {currentScreen === 'issue_detail' && activeReport && activeIssue && (
        <IssueDetailScreen
          report={activeReport}
          issue={activeIssue}
          onBack={handleBackToReport}
          onOpenPhoto={handleOpenPhoto}
          onIssueDeleted={handleBackToReport}
        />
      )}

      {/* Screen 4 Loading State */}
      {currentScreen === 'issue_detail' && activeReport && !activeIssue && isLoadingIssues && (
        <div className="max-w-md mx-auto py-20 px-6 text-center">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-base font-semibold text-stone-700">Loading issue details...</p>
        </div>
      )}

      {/* Screen 5: Photo Detail / Edit */}
      {currentScreen === 'photo_detail' && activeReport && activeIssue && activePhoto && (
        <PhotoDetailScreen
          report={activeReport}
          issue={activeIssue}
          photo={activePhoto}
          onBack={handleBackToIssue}
          onPhotoDeleted={handleBackToIssue}
        />
      )}

      {/* Screen 5 Loading State */}
      {currentScreen === 'photo_detail' && activeReport && activeIssue && !activePhoto && isLoadingPhotos && (
        <div className="max-w-md mx-auto py-20 px-6 text-center">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-base font-semibold text-stone-700">Loading photo details...</p>
        </div>
      )}

      {/* Fallback if navigated to a missing item */}
      {currentScreen !== 'reports_home' &&
        !isLoadingReports &&
        ((!activeReport) ||
          (currentScreen === 'issue_detail' && !isLoadingIssues && !activeIssue) ||
          (currentScreen === 'photo_detail' && !isLoadingPhotos && (!activeIssue || !activePhoto))) && (
          <div className="max-w-md mx-auto py-20 px-6 text-center">
            <h2 className="text-xl font-bold text-stone-900">Item not found</h2>
            <p className="text-stone-600 text-sm mt-2">
              The requested report, issue, or photo is no longer available.
            </p>
            <button
              type="button"
              onClick={handleBackToReports}
              className="mt-6 px-6 py-3 bg-blue-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
            >
              Return to Reports Home
            </button>
          </div>
        )}
    </div>
  );
}
