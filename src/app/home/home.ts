import { Component, HostListener, OnInit, AfterViewInit, ElementRef } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

// تأكد من تثبيت AOS أولاً
// npm install aos
// npm install --save-dev @types/aos

declare const AOS: any;

@Component({
  selector: 'app-home',
  imports: [RouterLink, CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
  standalone: true
})
export class HomeComponent implements OnInit, AfterViewInit {
  
  isSticky = false;
  activeLink = 'الرئيسية';
  
 navLinks = [
    { name: 'الرئيسية', active: true },
    { name: 'الخدمات', active: false },
    { name: 'المميزات', active: false },
    { name: 'كيفية العمل', active: false },
    { name: 'آراء العملاء', active: false },
    { name: 'تواصل', active: false }
  ];

  stats = [
    { 
      value: '+10,000', 
      label: 'رائد أعمال', 
      current: 0,
      target: 10000,
      suffix: '+'
    },
    { 
      value: '95%', 
      label: 'نسبة الرضا', 
      current: 0,
      target: 95,
      suffix: '%'
    },
    { 
      value: '50%', 
      label: 'زيادة في الإنتاجية', 
      current: 0,
      target: 50,
      suffix: '%'
    }
  ];

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    // تحميل AOS Script
    this.loadAOSScript().then(() => {
      // Initialize AOS بعد ما يتحمل
      if (typeof AOS !== 'undefined') {
        AOS.init({
          duration: 800,
          easing: 'ease-out-cubic',
          once: true,
          offset: 100,
          delay: 50,
        });
      }
    });

    // Start number counter animations
    this.startCounterAnimations();
    
    // Add parallax effect
    this.initParallax();
    
    // Add custom cursor effect
    this.initCustomCursor();
  }

  ngAfterViewInit() {
    // Refresh AOS after view init
    setTimeout(() => {
      if (typeof AOS !== 'undefined') {
        AOS.refresh();
      }
    }, 100);

    // Add intersection observer for stats
    this.observeStats();
    
    // Add magnetic effect to buttons
    this.addMagneticEffect();
  }

  // تحميل AOS من CDN
  private loadAOSScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // تحقق إذا AOS محمل فعلاً
      if (typeof AOS !== 'undefined') {
        resolve();
        return;
      }

      // تحميل CSS
      const linkElement = document.createElement('link');
      linkElement.rel = 'stylesheet';
      linkElement.href = 'https://unpkg.com/aos@2.3.1/dist/aos.css';
      document.head.appendChild(linkElement);

      // تحميل JS
      const scriptElement = document.createElement('script');
      scriptElement.src = 'https://unpkg.com/aos@2.3.1/dist/aos.js';
      scriptElement.onload = () => resolve();
      scriptElement.onerror = () => reject();
      document.body.appendChild(scriptElement);
    });
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Sticky header
    this.isSticky = scrollTop > 100;
    
    // Scroll progress bar
    const winScroll = document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    
    document.documentElement.style.setProperty('--scroll-progress', scrolled + '%');
    
    // Parallax effect for hero elements
    const heroElements = document.querySelectorAll('.hero .badge, .hero h1, .hero p');
    heroElements.forEach((element: any, index) => {
      const speed = (index + 1) * 0.1;
      const yPos = -(scrollTop * speed);
      element.style.transform = `translateY(${yPos}px)`;
    });
    
    // Hide/show scroll indicator
    const scrollIndicator = document.querySelector('.scroll-indicator') as HTMLElement;
    if (scrollIndicator) {
      scrollIndicator.style.opacity = scrollTop > 200 ? '0' : '1';
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    // Parallax effect for floating elements
    const floatingElements = document.querySelectorAll('.float-icon');
    
    floatingElements.forEach((element: any, index) => {
      const speed = (index + 1) * 0.02;
      const x = (window.innerWidth - event.pageX * speed) / 100;
      const y = (window.innerHeight - event.pageY * speed) / 100;
      
      element.style.transform = `translateX(${x}px) translateY(${y}px)`;
    });
    
    // Parallax for gradient orbs
    const orbs = document.querySelectorAll('.gradient-orb');
    orbs.forEach((orb: any, index) => {
      const speed = (index + 1) * 0.01;
      const x = (event.pageX - window.innerWidth / 2) * speed;
      const y = (event.pageY - window.innerHeight / 2) * speed;
      
      orb.style.transform = `translate(${x}px, ${y}px)`;
    });
  }

  setActiveLink(link: any) {
    this.navLinks.forEach(l => l.active = false);
    link.active = true;
    this.activeLink = link.name;
    
    // Add click animation
    this.addClickRipple(event);
  }

  // ========== COUNTER ANIMATIONS ==========
  startCounterAnimations() {
    this.stats.forEach((stat, index) => {
      setTimeout(() => {
        this.animateCounter(stat);
      }, index * 200);
    });
  }

  animateCounter(stat: any) {
    const duration = 2000;
    const frameRate = 1000 / 60;
    const totalFrames = Math.round(duration / frameRate);
    const increment = stat.target / totalFrames;
    
    let currentFrame = 0;
    
    const timer = setInterval(() => {
      currentFrame++;
      stat.current += increment;
      
      if (currentFrame === totalFrames) {
        stat.current = stat.target;
        clearInterval(timer);
      }
      
      // Update value with suffix
      stat.value = Math.round(stat.current) + stat.suffix;
    }, frameRate);
  }

  // ========== INTERSECTION OBSERVER FOR STATS ==========
  observeStats() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Restart counter animation when stats come into view
          if (entry.target.classList.contains('stat-item')) {
            this.startCounterAnimations();
          }
        }
      });
    }, {
      threshold: 0.5
    });

    const statElements = document.querySelectorAll('.stat-item');
    statElements.forEach(el => observer.observe(el));
  }

  // ========== PARALLAX EFFECT ==========
  initParallax() {
    const parallaxElements = document.querySelectorAll('[data-parallax]');
    
    window.addEventListener('scroll', () => {
      parallaxElements.forEach((element: any) => {
        const speed = element.getAttribute('data-parallax') || 0.5;
        const yPos = -(window.pageYOffset * parseFloat(speed));
        element.style.transform = `translateY(${yPos}px)`;
      });
    });
  }

  // ========== CUSTOM CURSOR EFFECT ==========
  initCustomCursor() {
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    cursor.style.cssText = `
      position: fixed;
      width: 20px;
      height: 20px;
      border: 2px solid #3b5bfd;
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      transition: all 0.15s ease;
      transform: translate(-50%, -50%);
      mix-blend-mode: difference;
    `;
    document.body.appendChild(cursor);

    const cursorDot = document.createElement('div');
    cursorDot.className = 'custom-cursor-dot';
    cursorDot.style.cssText = `
      position: fixed;
      width: 8px;
      height: 8px;
      background: #ff7a18;
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      transition: all 0.1s ease;
      transform: translate(-50%, -50%);
    `;
    document.body.appendChild(cursorDot);

    document.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
      
      setTimeout(() => {
        cursorDot.style.left = e.clientX + 'px';
        cursorDot.style.top = e.clientY + 'px';
      }, 50);
    });

    // Grow cursor on hover
    const hoverElements = document.querySelectorAll('a, button, .card, .nav-links li');
    hoverElements.forEach(element => {
      element.addEventListener('mouseenter', () => {
        cursor.style.width = '40px';
        cursor.style.height = '40px';
        cursor.style.borderColor = '#ff7a18';
      });
      
      element.addEventListener('mouseleave', () => {
        cursor.style.width = '20px';
        cursor.style.height = '20px';
        cursor.style.borderColor = '#3b5bfd';
      });
    });
  }

  // ========== MAGNETIC EFFECT FOR BUTTONS ==========
  addMagneticEffect() {
    const magneticElements = document.querySelectorAll('.btn-primary, .btn-secondary, .btn-outline');
    
    magneticElements.forEach((element: any) => {
      element.addEventListener('mousemove', (e: MouseEvent) => {
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        element.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
      });
      
      element.addEventListener('mouseleave', () => {
        element.style.transform = 'translate(0, 0)';
      });
    });
  }

  // ========== CLICK RIPPLE EFFECT ==========
  addClickRipple(event: any) {
    const target = event.currentTarget;
    const ripple = document.createElement('span');
    
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(59, 91, 253, 0.4);
      border-radius: 50%;
      pointer-events: none;
      animation: ripple-animation 0.6s ease-out;
    `;
    
    target.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  // ========== SMOOTH SCROLL TO SECTION ==========
  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      const offsetTop = element.offsetTop - 100;
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  }

  // ========== TILT EFFECT FOR CARDS ==========
  initTiltEffect() {
    const cards = document.querySelectorAll('.card');
    
    cards.forEach((card: any) => {
      card.addEventListener('mousemove', (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px) scale(1.02)`;
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0) scale(1)';
      });
    });
  }

  // ========== TYPING EFFECT FOR HEADING ==========
  initTypingEffect() {
    const heading = document.querySelector('.hero h1');
    if (heading) {
      const text = heading.textContent || '';
      heading.textContent = '';
      
      let i = 0;
      const typeWriter = () => {
        if (i < text.length) {
          heading.textContent += text.charAt(i);
          i++;
          setTimeout(typeWriter, 100);
        }
      };
      
      setTimeout(typeWriter, 500);
    }
  }

  // ========== PARTICLE SYSTEM ==========
  initParticleSystem() {
    const particlesContainer = document.querySelector('.header-particles');
    if (!particlesContainer) return;

    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 5 + 's';
      particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
      particlesContainer.appendChild(particle);
    }
  }

  // ========== SCROLL REVEAL ANIMATION ==========
  initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal');
    
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
        }
      });
    }, {
      threshold: 0.2
    });
    
    revealElements.forEach(el => revealObserver.observe(el));
  }

  // ========== TEXT SPLIT ANIMATION ==========
  splitTextAnimation(element: HTMLElement) {
    const text = element.textContent || '';
    element.textContent = '';
    
    text.split('').forEach((char, index) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.animationDelay = `${index * 0.05}s`;
      span.classList.add('char-animate');
      element.appendChild(span);
    });
  }

  // ========== DESTROY COMPONENT ==========
  ngOnDestroy() {
    // Clean up custom cursor
    const cursor = document.querySelector('.custom-cursor');
    const cursorDot = document.querySelector('.custom-cursor-dot');
    if (cursor) cursor.remove();
    if (cursorDot) cursorDot.remove();
    
    // Destroy AOS
    if (typeof AOS !== 'undefined') {
      AOS.refresh();
    }
  }
}