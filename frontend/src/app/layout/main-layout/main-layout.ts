import { Component, DestroyRef, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { NotificationsService } from '../../core/services/notifications';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout implements OnInit {
  readonly auth          = inject(AuthService);
  readonly notifications = inject(NotificationsService);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Pages scroll inside <main>, not the window, so the router's own scroll restoration never applies. */
  private readonly scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');
  private readonly scrollPositions = new Map<number, number>();
  private currentNavigationId = 0;
  private restoreNavigationId: number | null = null;

  sidebarOpen = signal(true);

  navItems: NavItem[] = [
    { label: "Fil d'actualité", route: '/feed',     icon: 'home' },
    { label: 'Amis',            route: '/friends',   icon: 'users' },
    { label: 'Messages',        route: '/messages',  icon: 'chat' },
    { label: 'Débats',          route: '/debates',   icon: 'debate' },
    { label: 'Statuts',         route: '/statuses',  icon: 'clock' },
    { label: 'Lives',           route: '/lives',     icon: 'video' },
    { label: 'Notifications',   route: '/notifications', icon: 'bell' },
  ];

  ngOnInit() {
    this.notifications.refreshUnreadCount();

    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event instanceof NavigationStart) {
        const el = this.scrollContainer()?.nativeElement;
        if (el) this.scrollPositions.set(this.currentNavigationId, el.scrollTop);
        this.restoreNavigationId =
          event.navigationTrigger === 'popstate' ? event.restoredState?.navigationId ?? null : null;
      } else if (event instanceof NavigationEnd) {
        this.currentNavigationId = event.id;
        const target = this.restoreNavigationId !== null ? this.scrollPositions.get(this.restoreNavigationId) ?? 0 : 0;
        this.restoreScroll(target);
      }
    });
  }

  /** Waits (up to 2 s) for async content such as API lists to be tall enough before restoring. */
  private restoreScroll(target: number) {
    const el = this.scrollContainer()?.nativeElement;
    if (!el) return;
    if (target <= 0) {
      el.scrollTop = 0;
      return;
    }
    const deadline = performance.now() + 2000;
    const attempt = () => {
      if (el.scrollHeight - el.clientHeight >= target || performance.now() > deadline) {
        el.scrollTop = target;
        return;
      }
      requestAnimationFrame(attempt);
    };
    requestAnimationFrame(attempt);
  }

  initials(): string {
    const name = this.auth.currentUser()?.displayName ?? '';
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '??';
  }

  logout() {
    this.notifications.unreadCount.set(0);
    this.auth.logout();
  }
}
