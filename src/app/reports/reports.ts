import { OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SideBar } from '../side-bar/side-bar';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface ReportTemplate {
  id: number; title: string; description: string;
  icon: string; type: 'financial'|'marketing'|'tasks'|'team'|'comprehensive'|'custom'; color: string;
}
interface SavedReport {
  id: number; title: string; status: 'ready'|'draft'|'processing';
  date: string; views: number; author: string; type: string; format: 'pdf'|'excel';
}
interface ReportOptions {
  type: 'financial'|'marketing'|'tasks'|'team'|'comprehensive'|'custom';
  startDate: string; endDate: string; format: 'pdf'|'excel';
}

const MOCK_SAVED_REPORTS: SavedReport[] = [
  { id:1, title:'التقرير المالي - يناير 2025', status:'ready', date:'١٥ يناير ٢٠٢٥', views:12, author:'أحمد الشمري', type:'financial', format:'pdf' },
  { id:2, title:'تقرير التسويق الشهري', status:'ready', date:'١٠ فبراير ٢٠٢٥', views:8, author:'سارة المنصوري', type:'marketing', format:'pdf' },
  { id:3, title:'تقرير الفريق - الربع الأول', status:'ready', date:'٢ مارس ٢٠٢٥', views:21, author:'أحمد الشمري', type:'team', format:'excel' },
  { id:4, title:'تقرير المهام المكتملة', status:'draft', date:'٢٠ مارس ٢٠٢٥', views:3, author:'خالد الحربي', type:'tasks', format:'pdf' },
  { id:5, title:'التقرير الشامل - مارس', status:'ready', date:'١ أبريل ٢٠٢٥', views:35, author:'أحمد الشمري', type:'comprehensive', format:'pdf' },
  { id:6, title:'تقرير أداء الحملات', status:'processing', date:'٥ أبريل ٢٠٢٥', views:0, author:'نورة القحطاني', type:'marketing', format:'excel' },
];

@Component({
  selector: 'app-reports',
  imports: [CommonModule, SideBar, FormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
  standalone: true
})
export class Reports implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('sidebarRef') sidebarComponent?: SideBar;
  @ViewChild('reportsChart') reportsChartCanvas!: ElementRef<HTMLCanvasElement>;

  isLoading = false; isGenerating = false;
  errorMessage = ''; successMessage = '';
  isSidebarCollapsed = false;

  totalReports = 6; totalDownloads = 87; totalShares = 34; totalViews = 312;

  reportTemplates: ReportTemplate[] = [
    { id:1, title:'تقرير الأداء الشامل', description:'نظرة شاملة على جميع جوانب المشروع', icon:'📊', type:'comprehensive', color:'#3b82f6' },
    { id:2, title:'التقرير المالي', description:'الإيرادات والمصروفات والأرباح', icon:'💰', type:'financial', color:'#1f9950' },
    { id:3, title:'تقرير التسويق', description:'أداء الحملات والمحتوى التسويقي', icon:'📈', type:'marketing', color:'#f97316' },
    { id:4, title:'تقرير المهام', description:'المهام المكتملة والمعلقة والمتأخرة', icon:'✅', type:'tasks', color:'#8b5cf6' },
    { id:5, title:'تقرير الفريق', description:'إنتاجية الفريق والمهام المكتملة', icon:'👥', type:'team', color:'#ec4899' },
    { id:6, title:'تقرير مخصص', description:'اختر العناصر التي تريد تضمينها', icon:'⚙️', type:'custom', color:'#06b6d4' },
  ];

  savedReportsList: SavedReport[] = [...MOCK_SAVED_REPORTS];
  filteredReports: SavedReport[] = [...MOCK_SAVED_REPORTS];
  searchQuery = ''; selectedTypeFilter = 'all';

  reportOptions: ReportOptions = {
    type: 'financial', startDate: this.getFirstDayOfMonth(), endDate: this.getToday(), format: 'pdf'
  };

  customSections = [
    { id:'overview', label:'نظرة عامة', selected:true },
    { id:'financial', label:'البيانات المالية', selected:true },
    { id:'tasks', label:'المهام', selected:false },
    { id:'team', label:'الفريق', selected:false },
    { id:'marketing', label:'التسويق', selected:false },
    { id:'analytics', label:'التحليلات', selected:false }
  ];

  showCreateModal = false; showCustomModal = false; showGuide = false;
  private chart: any = null;

  ngOnInit(): void {}
  ngAfterViewInit(): void { setTimeout(() => this.initChart(), 200); }
  ngOnDestroy(): void { if (this.chart) this.chart.destroy(); }
  onSidebarToggle(collapsed: boolean) { this.isSidebarCollapsed = collapsed; }

  /** يفتح الـ sidebar على موبايل/تابلت */
  openSidebar() { this.sidebarComponent?.openMobile(); }

  initChart(): void {
    if (!this.reportsChartCanvas) return;
    const ctx = this.reportsChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['أكتوبر','نوفمبر','ديسمبر','يناير','فبراير','مارس','أبريل'],
        datasets: [{
          label:'عدد التقارير', data:[4,7,5,9,6,11,8],
          backgroundColor:'rgba(31,153,80,0.15)', borderColor:'#1f9950',
          borderWidth:2, borderRadius:8, borderSkipped:false, barThickness:32
        }]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins: {
          legend:{display:false},
          tooltip:{
            backgroundColor:'#0a2e1a', padding:12, titleColor:'#a8edbc', bodyColor:'#fff',
            borderColor:'#1f9950', borderWidth:1, displayColors:false,
            callbacks:{ label:(c:any)=>`عدد التقارير: ${c.parsed.y}` }
          }
        },
        scales: {
          y:{beginAtZero:true, grid:{color:'#e8f0eb'}, ticks:{font:{family:'Cairo',size:11},color:'#6b9278'}},
          x:{grid:{display:false}, ticks:{font:{family:'Cairo',size:11},color:'#6b9278'}}
        }
      }
    });
  }

  createReport(template: ReportTemplate): void {
    this.reportOptions.type = template.type;
    template.type === 'custom' ? (this.showCustomModal = true) : (this.showCreateModal = true);
  }
  createNewReport(): void { this.showCreateModal = true; }

  generateReport(): void {
    if (new Date(this.reportOptions.startDate) > new Date(this.reportOptions.endDate)) {
      this.showError('تاريخ البداية يجب أن يكون قبل تاريخ النهاية'); return;
    }
    this.isGenerating = true;
    setTimeout(() => {
      const typeLabels: any = { financial:'التقرير المالي', marketing:'تقرير التسويق', tasks:'تقرير المهام', team:'تقرير الفريق', comprehensive:'التقرير الشامل', custom:'تقرير مخصص' };
      const newReport: SavedReport = {
        id:Date.now(), title:`${typeLabels[this.reportOptions.type]} - ${new Date().toLocaleDateString('ar-SA')}`,
        status:'ready', date:new Date().toLocaleDateString('ar-SA'), views:0,
        author:'أنت', type:this.reportOptions.type, format:this.reportOptions.format
      };
      this.savedReportsList.unshift(newReport);
      this.filteredReports = [...this.savedReportsList];
      this.totalReports++; this.totalDownloads++;
      this.isGenerating = false; this.showCreateModal = false; this.showCustomModal = false;
      this.showSuccess(`تم إنشاء "${newReport.title}" بنجاح وجاهز للتحميل!`);
    }, 1200);
  }

  cancelReportGeneration(): void { this.showCreateModal = false; this.showCustomModal = false; }
  toggleCustomSection(section: any): void { section.selected = !section.selected; }

  filterReports(): void {
    let list = [...this.savedReportsList];
    if (this.selectedTypeFilter !== 'all') list = list.filter(r => r.type === this.selectedTypeFilter);
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(r => r.title.toLowerCase().includes(q) || r.author.toLowerCase().includes(q));
    }
    this.filteredReports = list;
  }

  viewReport(report: SavedReport): void { report.views++; this.totalViews++; this.showSuccess(`جاري فتح "${report.title}"`); }
  downloadReport(report: SavedReport): void { this.totalDownloads++; this.showSuccess(`جاري تحميل "${report.title}" بصيغة ${report.format.toUpperCase()}`); }
  shareReport(report: SavedReport): void { this.totalShares++; this.showSuccess('تم نسخ رابط التقرير بنجاح'); }
  deleteReport(report: SavedReport): void {
    if (!confirm(`هل أنت متأكد من حذف "${report.title}"؟`)) return;
    this.savedReportsList = this.savedReportsList.filter(r => r.id !== report.id);
    this.filteredReports = this.filteredReports.filter(r => r.id !== report.id);
    this.totalReports--; this.showSuccess('تم حذف التقرير بنجاح');
  }

  getStatusText(status: string): string {
    const map: any = { ready:'جاهز', draft:'مسودة', processing:'قيد المعالجة' };
    return map[status] || status;
  }

  openGuide() { this.showGuide = true; }
  closeGuide() { this.showGuide = false; }

  showSuccess(msg: string) { this.successMessage = msg; setTimeout(()=>this.successMessage='', 3500); }
  showError(msg: string) { this.errorMessage = msg; setTimeout(()=>this.errorMessage='', 3500); }
  getFirstDayOfMonth(): string { const d=new Date(); return new Date(d.getFullYear(),d.getMonth(),1).toISOString().split('T')[0]; }
  getToday(): string { return new Date().toISOString().split('T')[0]; }
}