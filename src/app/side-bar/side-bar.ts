import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth';
import { Router } from '@angular/router';
interface MenuItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-side-bar',
standalone: true,
imports: [CommonModule, RouterModule],
  templateUrl: './side-bar.html',
  styleUrl: './side-bar.css',
})
export class SideBar {
  isCollapsed = false;

  @Output() collapsedChange = new EventEmitter<boolean>();

  menuItems: MenuItem[] = [
    { label: 'الخطة التسويقية', icon: '/highlighter.svg', route: '/marketing' },
    { label: 'الحسابات المالية', icon: '/clipboard-data.svg', route: '/financial-overview' },
    { label: 'المهام والفريق', icon: '/list-task.svg', route: '/tasks-and-team' },
    { label: 'التحليلات', icon: '/graph-up-arrow.svg', route: '/analytics' },
    { label: 'المجتمع', icon: '/globe-americas.svg', route: '/community' },
    { label: 'النقاط والمكافآت', icon: '/trophy.svg', route: '/rewards' },
    { label: 'التقارير', icon: '/file-earmark-arrow-down.svg', route: '/reports' }
  ];

  userInfo = {
    name: 'محمد أحمد',
    role: 'صاحب مشروع',
    avatar: 'م'
  };

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    this.collapsedChange.emit(this.isCollapsed);
  }

  logout() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }
}