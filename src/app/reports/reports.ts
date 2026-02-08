import {  OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SideBar } from '../side-bar/side-bar';
import { Chart, registerables } from 'chart.js';


interface ReportTemplate {
  id: number;
  title: string;
  description: string;
  icon: string;
  iconClass: string;
}

interface SavedReport {
  id: number;
  title: string;
  status: 'ready' | 'draft' | 'processing';
  date: string;
  views: number;
  author?: string;
}

interface Activity {
  id: number;
  title: string;
  author: string;
  time: string;
}

@Component({
  selector: 'app-reports',
  imports: [CommonModule,SideBar],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class Reports implements OnInit, AfterViewInit{
 @ViewChild('reportsChart') reportsChartCanvas!: ElementRef<HTMLCanvasElement>;
  
  // Statistics
  savedReports: number = 24;
  shares: number = 18;
  downloads: number = 156;

  // Report Templates
  reportTemplates: ReportTemplate[] = [
    {
      id: 1,
      title: 'تقرير الأداء الشامل',
      description: 'نظرة شاملة على جميع جوانب المشروع',
      icon: 'performance',
      iconClass: 'blue-icon'
    },
    {
      id: 2,
      title: 'التقرير المالي',
      description: 'الإيرادات والمصروفات والأرباح',
      icon: 'financial',
      iconClass: 'green-icon'
    },
    {
      id: 3,
      title: 'تقرير التسويق',
      description: 'أداء الحملات والمحتوى التسويقي',
      icon: 'marketing',
      iconClass: 'orange-icon'
    },
    {
      id: 4,
      title: 'تقرير المبيعات',
      description: 'المبيعات والصفقات والعقبات',
      icon: 'sales',
      iconClass: 'purple-icon'
    },
    {
      id: 5,
      title: 'تقرير الفريق',
      description: 'إنتاجية الفريق والمهام المكتملة',
      icon: 'team',
      iconClass: 'pink-icon'
    },
    {
      id: 6,
      title: 'تقرير مخصص',
      description: 'اختر العناصر التي تريد تضمينها',
      icon: 'custom',
      iconClass: 'cyan-icon'
    }
  ];

  // Saved Reports List
  savedReportsList: SavedReport[] = [
    {
      id: 1,
      title: 'تقرير الأداء الشهري',
      status: 'ready',
      date: 'يناير 2026',
      views: 12
    },
    {
      id: 2,
      title: 'تقرير المبيعات الأسبوعي',
      status: 'processing',
      date: 'الأسبوع الأول - يناير',
      views: 8
    },
    {
      id: 3,
      title: 'تحليل الحملات التسويقية',
      status: 'draft',
      date: 'ديسمبر 2025',
      views: 5
    }
  ];

  // Recent Activities
  recentActivities: Activity[] = [
    {
      id: 1,
      title: 'تم إنشاء تقرير الأداء الشهري',
      author: 'أنت',
      time: 'منذ ساعتين'
    },
    {
      id: 2,
      title: 'تم مشاركة تقرير المبيعات',
      author: 'محمد أحمد',
      time: 'أمس'
    },
    {
      id: 3,
      title: 'تم تحميل التقرير المالي',
      author: 'سارة علي',
      time: 'منذ يومين'
    }
  ];

  // Chart Data
  chartData = {
    labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
    datasets: [{
      label: 'عدد التقارير',
      data: [8, 12, 15, 10, 18, 24],
      backgroundColor: '#ff6b35',
      borderRadius: 8,
      barThickness: 40
    }]
  };

  private chart: any = null;

  constructor() { }

  ngOnInit(): void {
    // Initialize component
  }

  ngAfterViewInit(): void {
    this.initChart();
  }

  // Initialize Chart
  initChart(): void {
    if (this.reportsChartCanvas && typeof window !== 'undefined') {
      // Check if Chart.js is available
      const ChartJS = (window as any).Chart;
      if (!ChartJS) {
        console.warn('Chart.js is not loaded');
        return;
      }

      const ctx = this.reportsChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.chart = new ChartJS(ctx, {
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
  }

  createNewReport(): void {
    console.log('إنشاء تقرير جديد');
    // Navigate to report creation page
  }

  // Template Actions
  createReport(template: ReportTemplate): void {
    console.log('إنشاء تقرير من القالب:', template.title);
    // Navigate to report creation with selected template
  }

  // Saved Reports Actions
  viewReport(report: SavedReport): void {
    console.log('عرض التقرير:', report.title);
    // Navigate to report view page
  }

  downloadReport(report: SavedReport): void {
    console.log('تحميل التقرير:', report.title);
    // Implement download functionality
    alert(`جاري تحميل ${report.title}...`);
  }

  shareReport(report: SavedReport): void {
    console.log('مشاركة التقرير:', report.title);
    // Implement share dialog
    alert(`مشاركة ${report.title}`);
  }

  // Export Functions
  exportToExcel(): void {
    console.log('تصدير إلى Excel');
    // Implement Excel export
    alert('جاري تصدير البيانات إلى Excel...');
  }

  exportToPDF(): void {
    console.log('تصدير إلى PDF');
    // Implement PDF export
    alert('جاري تصدير البيانات إلى PDF...');
  }

  exportAll(): void {
    console.log('تصدير جميع البيانات');
    // Implement complete export
    alert('جاري تصدير جميع البيانات...');
  }

  // Cleanup
  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }
}
