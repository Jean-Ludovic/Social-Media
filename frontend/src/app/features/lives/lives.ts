import { Component } from '@angular/core';

@Component({
  selector: 'app-lives',
  imports: [],
  templateUrl: './lives.html',
  styleUrl: './lives.scss',
})
export class Lives {
  lives = [
    { id: '1', title: 'Débat en direct : IA & Futur du Travail', host: 'Clara Fontaine', hostInitials: 'CF', hostColor: 'linear-gradient(135deg,#22c55e,#10b981)', color: 'linear-gradient(135deg,#667eea,#764ba2)', viewers: '1.2k' },
    { id: '2', title: 'Tech Talk : Les nouveautés Angular 2025',  host: 'Alice Martin',   hostInitials: 'AM', hostColor: 'linear-gradient(135deg,#ec4899,#f43f5e)', color: 'linear-gradient(135deg,#f093fb,#f5576c)', viewers: '876' },
    { id: '3', title: 'Discussion : Réseaux Sociaux & Démocratie', host: 'Bob Dupont',   hostInitials: 'BD', hostColor: 'linear-gradient(135deg,#3b82f6,#06b6d4)', color: 'linear-gradient(135deg,#4facfe,#00f2fe)', viewers: '342' },
  ];
}
