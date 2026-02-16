import { OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SideBar } from '../side-bar/side-bar';
import { Chart, registerables } from 'chart.js';
import { ProjectService, Project } from '../services/project';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

Chart.register(...registerables);

// Interfaces
interface ReportTemplate {
  id: number;
  title: string;
  description: string;
  icon: string;
  iconClass: string;
  type: 'financial' | 'marketing' | 'tasks' | 'team' | 'comprehensive' | 'custom';
}

interface SavedReport {
  id: number;
  title: string;
  status: 'ready' | 'draft' | 'processing';
  date: string;
  views: number;
  author?: string;
  type?: string;
  format?: 'pdf' | 'excel';
}

interface Activity {
  id: number;
  title: string;
  author: string;
  time: string;
}

interface ReportOptions {
  type: 'financial' | 'marketing' | 'tasks' | 'team' | 'comprehensive' | 'custom';
  startDate: string;
  endDate: string;
  format: 'pdf' | 'excel';
  includeSections?: string[];
}

@Component({
  selector: 'app-reports',
  imports: [CommonModule, SideBar, FormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
  standalone: true
})
export class Reports implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('reportsChart') reportsChartCanvas!: ElementRef<HTMLCanvasElement>;
  
  // Loading & Error States
  isLoading = false;
  isGenerating = false;
  errorMessage = '';
  successMessage = '';
  
  // Current Project
  currentProject: Project | null = null;
  currentProjectId: number = 0;
  
  // Statistics (Dynamic)
  savedReports: number = 0;
  shares: number = 0;
  downloads: number = 0;

  // Report Templates
  reportTemplates: ReportTemplate[] = [
    {
      id: 1,
      title: 'تقرير الأداء الشامل',
      description: 'نظرة شاملة على جميع جوانب المشروع',
      icon: '📊',
      iconClass: 'blue-icon',
      type: 'comprehensive'
    },
    {
      id: 2,
      title: 'التقرير المالي',
      description: 'الإيرادات والمصروفات والأرباح',
      icon: '💰',
      iconClass: 'green-icon',
      type: 'financial'
    },
    {
      id: 3,
      title: 'تقرير التسويق',
      description: 'أداء الحملات والمحتوى التسويقي',
      icon: '📈',
      iconClass: 'orange-icon',
      type: 'marketing'
    },
    {
      id: 4,
      title: 'تقرير المهام',
      description: 'المهام المكتملة والمعلقة',
      icon: '✅',
      iconClass: 'purple-icon',
      type: 'tasks'
    },
    {
      id: 5,
      title: 'تقرير الفريق',
      description: 'إنتاجية الفريق والمهام المكتملة',
      icon: '👥',
      iconClass: 'pink-icon',
      type: 'team'
    },
    {
      id: 6,
      title: 'تقرير مخصص',
      description: 'اختر العناصر التي تريد تضمينها',
      icon: '⚙️',
      iconClass: 'cyan-icon',
      type: 'custom'
    }
  ];

  // Saved Reports List (Dynamic from Backend)
  savedReportsList: SavedReport[] = [];

  // Recent Activities (Dynamic)
  recentActivities: Activity[] = [];

  // Chart Data
  chartData = {
    labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
    datasets: [{
      label: 'عدد التقارير',
      data: [0, 0, 0, 0, 0, 0],
      backgroundColor: '#ff6b35',
      borderRadius: 8,
      barThickness: 40
    }]
  };

  private chart: any = null;
  
  // Report Generation Options
  reportOptions: ReportOptions = {
    type: 'financial',
    startDate: this.getFirstDayOfMonth(),
    endDate: this.getToday(),
    format: 'pdf',
    includeSections: []
  };
  
  // Custom Report Sections
  customSections = [
    { id: 'overview', label: 'نظرة عامة', selected: true },
    { id: 'financial', label: 'البيانات المالية', selected: true },
    { id: 'tasks', label: 'المهام', selected: false },
    { id: 'team', label: 'الفريق', selected: false },
    { id: 'marketing', label: 'التسويق', selected: false },
    { id: 'analytics', label: 'التحليلات', selected: false }
  ];
  
  // Modal States
  showCreateModal = false;
  showCustomModal = false;
  
  // API URL
  private apiUrl = 'http://localhost:5000/api/v1';

  constructor(
    private projectService: ProjectService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    console.log('📄 Reports Component Initialized');
    this.loadCurrentProject();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initChart();
    }, 100);
  }

  // Load Current Project
  loadCurrentProject() {
    this.isLoading = true;
    
    this.projectService.getProjects().subscribe({
      next: (response: any) => {
        console.log('📦 Projects loaded:', response);
        
        if (response && response.data && response.data.length > 0) {
          this.currentProject = response.data[0];
          this.currentProjectId = this.currentProject!.id!;
          
          // Load reports data
          this.loadReportsData();
        } else {
          this.errorMessage = 'لا توجد مشاريع. قم بإنشاء مشروعك الأول!';
          this.isLoading = false;
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('❌ Error loading projects:', error);
        this.errorMessage = 'حدث خطأ في تحميل المشاريع';
        this.isLoading = false;
      }
    });
  }

  // Load Reports Data
  loadReportsData() {
    console.log('📊 Loading reports data...');
    
    // Load report history (if available)
    this.loadReportHistory();
    
    // Load report statistics
    this.loadReportStatistics();
    
    this.isLoading = false;
  }

  // Load Report History
  loadReportHistory() {
    this.http.get(`${this.apiUrl}/projects/${this.currentProjectId}/reports/history`).subscribe({
      next: (response: any) => {
        console.log('📋 Report history loaded:', response);
        
        if (response && response.data) {
          this.savedReportsList = response.data.map((report: any) => ({
            id: report.id,
            title: report.title || report.type,
            status: 'ready',
            date: new Date(report.createdAt).toLocaleDateString('ar-SA'),
            views: report.views || 0,
            author: report.author || 'أنت',
            type: report.type,
            format: report.format
          }));
          
          this.savedReports = this.savedReportsList.length;
          
          // Update recent activities
          this.updateRecentActivities();
        }
      },
      error: (error: HttpErrorResponse) => {
        console.log('ℹ️ No report history available yet');
        // This is OK - user might not have generated reports yet
      }
    });
  }

  // Load Report Statistics
  loadReportStatistics() {
    // For now, use mock data
    // In the future, this will come from the backend
    this.chartData.datasets[0].data = [8, 12, 15, 10, 18, this.savedReports];
    
    if (this.chart) {
      this.chart.data.datasets[0].data = this.chartData.datasets[0].data;
      this.chart.update();
    }
  }

  // Update Recent Activities
  updateRecentActivities() {
    this.recentActivities = this.savedReportsList.slice(0, 3).map(report => ({
      id: report.id,
      title: `تم إنشاء ${report.title}`,
      author: report.author || 'أنت',
      time: this.getRelativeTime(report.date)
    }));
  }

  // Initialize Chart
  initChart(): void {
    if (this.reportsChartCanvas && typeof window !== 'undefined') {
      const ctx = this.reportsChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.chart = new Chart(ctx, {
          type: 'bar',
          data: this.chartData,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                backgroundColor: '#1a1a1a',
                padding: 12,
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: '#333',
                borderWidth: 1,
                displayColors: false,
                callbacks: {
                  label: (context: any) => {
                    return `عدد التقارير: ${context.parsed.y}`;
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: 6,
                  font: {
                    family: 'Segoe UI',
                    size: 12
                  }
                },
                grid: {
                  color: '#f0f0f0'
                }
              },
              x: {
                ticks: {
                  font: {
                    family: 'Segoe UI',
                    size: 12
                  }
                },
                grid: {
                  display: false
                }
              }
            }
          }
        });
      }
    }
  }

  // Get status text in Arabic
  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'ready': 'جاهز',
      'draft': 'مسودة',
      'processing': 'قيد المعالجة'
    };
    return statusMap[status] || status;
  }

  // Header Actions
  openDateFilter(): void {
    console.log('فتح تصفية التاريخ');
    // Implement date filter dialog
    alert('ميزة تصفية التاريخ ستكون متاحة قريباً');
  }

  createNewReport(): void {
    console.log('إنشاء تقرير جديد');
    this.showCreateModal = true;
  }

  // Template Actions
  createReport(template: ReportTemplate): void {
    console.log('إنشاء تقرير من القالب:', template.title);
    
    this.reportOptions.type = template.type;
    
    if (template.type === 'custom') {
      this.showCustomModal = true;
    } else {
      this.showCreateModal = true;
    }
  }

  // Generate Report
  generateReport(): void {
    if (!this.currentProjectId) {
      this.errorMessage = 'الرجاء اختيار مشروع أولاً';
      return;
    }

    // Validate dates
    if (new Date(this.reportOptions.startDate) > new Date(this.reportOptions.endDate)) {
      this.errorMessage = 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية';
      return;
    }

    this.isGenerating = true;
    this.errorMessage = '';
    this.successMessage = '';

    console.log('📊 Generating report:', this.reportOptions);

    // Prepare request body
    const requestBody: any = {
      type: this.reportOptions.type,
      startDate: this.reportOptions.startDate,
      endDate: this.reportOptions.endDate,
      format: this.reportOptions.format
    };

    // Add custom sections if custom report
    if (this.reportOptions.type === 'custom') {
      requestBody.includeSections = this.customSections
        .filter(s => s.selected)
        .map(s => s.id);
    }

    // Call API
    this.http.post(
      `${this.apiUrl}/projects/${this.currentProjectId}/reports/generate`,
      requestBody,
      { responseType: 'blob' }
    ).subscribe({
      next: (blob: Blob) => {
        console.log('✅ Report generated successfully');
        
        // Download file
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = Date.now();
        const extension = this.reportOptions.format === 'pdf' ? 'pdf' : 'xlsx';
        a.download = `report_${this.reportOptions.type}_${timestamp}.${extension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        this.isGenerating = false;
        this.successMessage = 'تم إنشاء التقرير بنجاح!';
        this.showCreateModal = false;
        this.showCustomModal = false;
        
        // Reload report history
        this.loadReportHistory();
        
        // Update statistics
        this.downloads++;
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error: HttpErrorResponse) => {
        console.error('❌ Error generating report:', error);
        
        let errorMsg = 'حدث خطأ في إنشاء التقرير';
        
        if (error.status === 401) {
          errorMsg = 'انتهت جلستك. الرجاء تسجيل الدخول مرة أخرى';
        } else if (error.status === 400) {
          errorMsg = 'البيانات المدخلة غير صحيحة';
        } else if (error.status === 404) {
          errorMsg = 'المشروع غير موجود';
        } else if (error.status === 500) {
          errorMsg = 'خطأ في الخادم. الرجاء المحاولة لاحقاً';
        }
        
        this.errorMessage = errorMsg;
        this.isGenerating = false;
      }
    });
  }

  // Cancel Report Generation
  cancelReportGeneration(): void {
    this.showCreateModal = false;
    this.showCustomModal = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  // Toggle Custom Section
  toggleCustomSection(section: any): void {
    section.selected = !section.selected;
  }

  // Saved Reports Actions
  viewReport(report: SavedReport): void {
    console.log('عرض التقرير:', report.title);
    alert(`ميزة عرض التقرير ستكون متاحة قريباً`);
  }

  downloadReport(report: SavedReport): void {
    console.log('تحميل التقرير:', report.title);
    
    // In real implementation, this would call the API to download
    alert(`جاري تحميل ${report.title}...`);
    this.downloads++;
  }

  shareReport(report: SavedReport): void {
    console.log('مشاركة التقرير:', report.title);
    
    // In real implementation, this would open a share dialog
    const shareUrl = `${window.location.origin}/reports/${report.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: report.title,
        text: `تقرير ${report.title}`,
        url: shareUrl
      }).then(() => {
        console.log('تمت المشاركة بنجاح');
        this.shares++;
      }).catch((error) => {
        console.log('خطأ في المشاركة:', error);
      });
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('تم نسخ رابط التقرير');
        this.shares++;
      });
    }
  }

  deleteReport(report: SavedReport): void {
    if (confirm(`هل أنت متأكد من حذف ${report.title}؟`)) {
      console.log('حذف التقرير:', report.title);
      
      // Remove from list
      this.savedReportsList = this.savedReportsList.filter(r => r.id !== report.id);
      this.savedReports--;
      
      alert('تم حذف التقرير بنجاح');
    }
  }

  // Export Functions
  exportToExcel(): void {
    console.log('تصدير إلى Excel');
    this.reportOptions.format = 'excel';
    this.generateReport();
  }

  exportToPDF(): void {
    console.log('تصدير إلى PDF');
    this.reportOptions.format = 'pdf';
    this.generateReport();
  }

  exportAll(): void {
    console.log('تصدير جميع البيانات');
    this.reportOptions.type = 'comprehensive';
    this.generateReport();
  }

  // Utility Functions
  
  getFirstDayOfMonth(): string {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1)
      .toISOString().split('T')[0];
  }

  getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return 'اليوم';
    } else if (diffInDays === 1) {
      return 'أمس';
    } else if (diffInDays < 7) {
      return `منذ ${diffInDays} أيام`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `منذ ${weeks} ${weeks === 1 ? 'أسبوع' : 'أسابيع'}`;
    } else {
      const months = Math.floor(diffInDays / 30);
      return `منذ ${months} ${months === 1 ? 'شهر' : 'أشهر'}`;
    }
  }

  // Cleanup
  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }
}