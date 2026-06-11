import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

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
export class MainLayout {
  sidebarOpen = signal(true);

  navItems: NavItem[] = [
    { label: "Fil d'actualité", route: '/feed',     icon: 'home' },
    { label: 'Amis',            route: '/friends',   icon: 'users' },
    { label: 'Messages',        route: '/messages',  icon: 'chat' },
    { label: 'Débats',          route: '/debates',   icon: 'debate' },
    { label: 'Statuts',         route: '/statuses',  icon: 'clock' },
    { label: 'Lives',           route: '/lives',     icon: 'video' },
  ];
}
