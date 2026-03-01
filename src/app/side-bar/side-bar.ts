import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, HostListener, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

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
export class SideBar implements OnInit, OnDestroy {
  isCollapsed = false;
  isMobileOpen = false;
  private userSub?: Subscription;

  @Output() collapsedChange = new EventEmitter<boolean>();

  menuItems: MenuItem[] = [
    { label: 'الخطة التسويقية', icon: '/highlighter.svg', route: '/marketing' },
    { label: 'الحسابات المالية', icon: '/clipboard-data.svg', route: '/financial-overview' },
    { label: 'المهام والفريق', icon: '/list-task.svg', route: '/tasks-and-team' },
    { label: 'التحليلات', icon: '/graph-up-arrow.svg', route: '/analytics' },
    { label: 'المجتمع', icon: '/globe-americas.svg', route: '/community' },
    { label: 'التقارير', icon: '/file-earmark-arrow-down.svg', route: '/reports' },
    { label: 'مساعد الذكاء الاصطناعي', icon: '/stars.svg', route: '/chat' }
  ];

  userInfo = {
    name: 'المستخدم',
    role: 'صاحب مشروع',
    avatar: 'م'
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // الاشتراك على currentUser Observable — يتحدث فور ما يرجع getProfile()
    this.userSub = this.authService.currentUser.subscribe(user => {
      if (user?.name) {
        this.userInfo.name   = user.name;
        this.userInfo.avatar = user.name.trim().charAt(0).toUpperCase();
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy() {
    this.userSub?.unsubscribe();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.isMobileOpen) this.closeMobile();
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    this.collapsedChange.emit(this.isCollapsed);
  }

  // Toggle: فتح لو مقفول، إغلاق لو مفتوح
  openMobile() {
    if (this.isMobileOpen) {
      this.closeMobile();
    } else {
      this.isMobileOpen = true;
      document.body.style.overflow = 'hidden';
      this.cdr.detectChanges();
    }
  }

  closeMobile() {
    this.isMobileOpen = false;
    document.body.style.overflow = '';
    this.cdr.detectChanges();
  }

  logout() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
      this.closeMobile();
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }
}