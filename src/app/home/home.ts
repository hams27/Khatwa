import { Component, HostListener, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, NgZone, inject } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { CommonModule, AsyncPipe } from '@angular/common';
import { ThemeService } from '../services/theme';

@Component({
  selector: 'app-home',
  imports: [RouterLink, CommonModule, RouterModule, AsyncPipe],
  templateUrl: './home.html',
  styleUrl: './home.css',
  standalone: true
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('testimonialsTrack') trackRef!: ElementRef;

  isSticky = false;
  mobileMenuOpen = false;

  public themeService = inject(ThemeService);

  navLinks = [
    { name: 'الرئيسية', sectionId: 'hero', active: true },
    { name: 'احتياجاتك', sectionId: 'احتياجاتك', active: false },
    { name: 'خطوات العمل', sectionId: 'خطوات العمل', active: false },
    { name: 'آراء العملاء', sectionId: 'آراء العملاء', active: false },
    { name: 'الأسئلة الشائعة', sectionId: 'الأسئلة الشائعة', active: false },
  ];

  stats = [
    { label: 'رائد أعمال', targetNumber: 10000, suffix: '+', displayValue: '0+' },
    { label: 'نسبة الرضا', targetNumber: 95, suffix: '%', displayValue: '0%' },
    { label: 'زيادة إنتاجية', targetNumber: 50, suffix: '%', displayValue: '0%' },
  ];

  particles = Array.from({ length: 18 }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 6,
    duration: 4 + Math.random() * 4
  }));

  needs = [
    { biIcon: 'bi bi-speedometer2 fs-3', title: 'لوحة تحكم ذكية', desc: 'شاشة واحدة تعرضلك كل شيء عن مشروعك في لمحة', bg: 'rgba(31,153,80,0.12)', color: '#1f9950' },
    { biIcon: 'bi bi-bullseye fs-3', title: 'تسويق مستهدف', desc: 'أدوات تسويق احترافية تساعدك توصل لعملائك الصح', bg: 'rgba(249,115,22,0.12)', color: '#f97316' },
    { biIcon: 'bi bi-wallet2 fs-3', title: 'إدارة مالية', desc: 'تتبع إيراداتك ومصروفاتك بدقة مع تقارير فورية', bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
    { biIcon: 'bi bi-check2-square fs-3', title: 'إدارة المهام', desc: 'نظّم فريقك وتتبع المهام حتى ما يضيع شيء', bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
    { biIcon: 'bi bi-graph-up-arrow fs-3', title: 'تحليلات عميقة', desc: 'بيانات وتقارير تساعدك تتخذ قرارات أذكى وأسرع', bg: 'rgba(236,72,153,0.12)', color: '#ec4899' },
    { biIcon: 'bi bi-people-fill fs-3', title: 'مجتمع داعم', desc: 'تواصل مع آلاف رواد الأعمال وشارك خبراتهم', bg: 'rgba(6,182,212,0.12)', color: '#06b6d4' },
  ];

  steps = [
    { biIcon: 'bi bi-person-plus-fill fs-1', title: 'أنشئ حسابك', desc: 'سجّل مجاناً في أقل من دقيقة بدون بطاقة ائتمان', badge: 'مجاني ١٠٠٪' },
    { biIcon: 'bi bi-briefcase-fill fs-1', title: 'أخبرنا عن مشروعك', desc: 'أدخل بيانات مشروعك وأهدافك وسنُعدّ كل شيء لك', badge: 'دقيقتان فقط' },
    { biIcon: 'bi bi-rocket-takeoff-fill fs-1', title: 'ابدأ النجاح', desc: 'احصل على خطط وأدوات جاهزة فوراً وابدأ رحلتك', badge: 'فوري' },
  ];

  testimonials = [
    { name: ' حسام محمد', role: 'مؤسس متجر إلكتروني', text: 'أفضل منصة استخدمتها لإدارة مشروعي. وفرت علي وقت ومجهود كتير جداً!' , stars: 5 },
    { name: 'سارة احمد', role: 'صاحبة مشروع تصميم', text: 'المنصة ساعدتني أنظم شغلي وأزود أرباحي بنسبة ١٥٠٪ في ٣ شهور!', stars: 4.5 },
    { name: 'خالد عبدالله', role: 'مدير تسويق', text: 'دعم فني ممتاز وأدوات قوية جداً. أنصح كل رائد أعمال يجربها' , stars: 5},
    { name: 'حسام نصرالله', role: 'رائدة أعمال', text: 'من أروع القرارات اللي اتخذتها للمشروع. الفريق محترف والمنصة سهلة', stars: 4 },
    { name: 'فيصل العتيبي', role: 'صاحب شركة ناشئة', text: 'خطوة غيّرت طريقة إدارتي للمشروع بالكامل. ما تخيلت إنه أسهل من كده' , stars: 4.5},
    { name: 'منال الزهراني', role: 'مؤسسة وكالة تسويق', text: 'التحليلات والتقارير أعطتني رؤية واضحة قدرت أبني عليها قرارات صح', stars: 4 },
  ];

  allTestimonials: any[] = [];

  faqs = [
    { q: 'هل خطوة مجانية؟', a: 'نعم! يمكنك البدء مجاناً بدون بطاقة ائتمان. لدينا خطة مجانية تشمل جميع الميزات الأساسية، وخطط متقدمة للمشاريع الأكبر.', open: false },
    { q: 'هل المنصة مناسبة للمشاريع الصغيرة؟', a: 'بالتأكيد! خطوة مصممة خصيصاً لأصحاب المشاريع الصغيرة ورواد الأعمال الشباب. بسيطة في الاستخدام وقوية في الإمكانيات.', open: false },
    { q: 'كيف يمكنني إضافة فريق العمل؟', a: 'بعد إنشاء حسابك، يمكنك دعوة أعضاء فريقك بسهولة عبر البريد الإلكتروني. كل عضو سيحصل على صلاحيات مخصصة حسب دوره.', open: false },
    { q: 'هل بياناتي آمنة؟', a: 'أمان بياناتك أولويتنا القصوى. نستخدم تشفيراً من الدرجة الأولى وننتهج أفضل ممارسات الأمن السيبراني لحماية معلوماتك.', open: false },
    { q: 'هل يمكنني تصدير تقارير؟', a: 'نعم! يمكنك تصدير جميع تقاريرك بصيغة PDF أو Excel في أي وقت. التقارير شاملة وتغطي جميع جوانب مشروعك.', open: false },
    { q: 'ما هي وسائل الدعم المتاحة؟', a: 'نقدم دعماً فنياً على مدار الساعة عبر الواتساب والبريد الإلكتروني والدردشة المباشرة. فريقنا مستعد دائماً لمساعدتك.', open: false },
  ];

  private scrollObserver?: IntersectionObserver;
  private typedInterval?: any;
  private typedPhrases = ['خطوة بخطوة', 'نحو النجاح', 'وبنساعدك دائماً', 'نحو أهدافك'];
  private typedIndex = 0;
  private charIndex = 0;
  private isDeleting = false;

  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  ngOnInit() {
    this.allTestimonials = [...this.testimonials, ...this.testimonials];
  }

  ngAfterViewInit() {
    this.initScrollReveal();
    this.initTypewriter();
    this.startCounters();
    this.forcePlayVideo();
  }

  ngOnDestroy() {
    if (this.scrollObserver) this.scrollObserver.disconnect();
    if (this.typedInterval) clearTimeout(this.typedInterval);
  }

  forcePlayVideo() {
    const video = document.querySelector('.hero-video') as HTMLVideoElement;
    if (!video) return;
    video.load();
    const tryPlay = () => {
      video.muted = true;
      video.play().catch(() => {
        document.addEventListener('click', () => video.play(), { once: true });
        document.addEventListener('touchstart', () => video.play(), { once: true });
      });
    };
    if (video.readyState >= 3) {
      tryPlay();
    } else {
      video.addEventListener('canplay', tryPlay, { once: true });
    }
  }

  initTypewriter() {
    const el = document.getElementById('typed-text');
    if (!el) return;
    const type = () => {
      const phrase = this.typedPhrases[this.typedIndex];
      if (this.isDeleting) {
        el.textContent = phrase.substring(0, this.charIndex - 1);
        this.charIndex--;
      } else {
        el.textContent = phrase.substring(0, this.charIndex + 1);
        this.charIndex++;
      }
      let speed = this.isDeleting ? 60 : 100;
      if (!this.isDeleting && this.charIndex === phrase.length) {
        speed = 2000;
        this.isDeleting = true;
      } else if (this.isDeleting && this.charIndex === 0) {
        this.isDeleting = false;
        this.typedIndex = (this.typedIndex + 1) % this.typedPhrases.length;
        speed = 400;
      }
      this.typedInterval = setTimeout(type, speed);
    };
    setTimeout(type, 1200);
  }

  initScrollReveal() {
    this.scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          this.scrollObserver!.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px 0px 0px' });

    const elements = document.querySelectorAll('.scroll-reveal');
    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('visible');
        el.classList.add('visible-instant');
      } else {
        this.scrollObserver!.observe(el);
      }
    });
  }

  startCounters() {
    this.ngZone.runOutsideAngular(() => {
      this.stats.forEach((stat, i) => {
        const end = stat.targetNumber;
        const dur = 1800;
        setTimeout(() => {
          const startTime = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - startTime) / dur, 1);
            const ease = progress < 0.7
              ? progress
              : 0.7 + (1 - Math.pow(1 - ((progress - 0.7) / 0.3), 2)) * 0.3;
            stat.displayValue = Math.floor(ease * end).toLocaleString('en') + stat.suffix;
            this.cdr.detectChanges();
            if (progress < 1) requestAnimationFrame(step);
            else {
              stat.displayValue = end.toLocaleString('en') + stat.suffix;
              this.cdr.detectChanges();
            }
          };
          requestAnimationFrame(step);
        }, i * 100);
      });
    });
  }

  @HostListener('window:scroll')
  onScroll() {
    this.isSticky = window.scrollY > 80;
    this.navLinks.forEach(link => {
      const el = document.getElementById(link.sectionId);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 100 && rect.bottom >= 100) {
          this.navLinks.forEach(l => l.active = false);
          link.active = true;
        }
      }
    });
  }

  setActiveLink(link: any) {
    this.navLinks.forEach(l => l.active = false);
    link.active = true;
  }

  scrollToSection(sectionId: string) {
    const el = document.getElementById(sectionId);
    if (el) {
      const top = el.offsetTop - 72;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  toggleFaq(faq: any) {
    faq.open = !faq.open;
  }
    scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
getStars(rating: number): string[] {
  const stars: string[] = [];
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  for (let i = 0; i < full; i++) stars.push('full');
  if (half) stars.push('half');
  for (let i = 0; i < empty; i++) stars.push('empty');

  return stars;
}
}