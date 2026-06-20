import { Component } from '@angular/core';

@Component({
  selector: 'app-debates',
  imports: [],
  templateUrl: './debates.html',
  styleUrl: './debates.scss',
})
export class Debates {
  debates = [
    {
      id: '1', author: 'Alice Martin', authorInitials: 'AM',
      authorColor: 'linear-gradient(135deg,#ec4899,#f43f5e)',
      question: "L'intelligence artificielle va-t-elle remplacer les développeurs d'ici 10 ans ?",
      sides: [{ label: 'Pour', pct: 58 }, { label: 'Contre', pct: 42 }],
      totalVotes: 342, comments: 67, time: 'Il y a 2h', category: 'Tech',
    },
    {
      id: '2', author: 'Bob Dupont', authorInitials: 'BD',
      authorColor: 'linear-gradient(135deg,#3b82f6,#06b6d4)',
      question: 'Les réseaux sociaux font-ils plus de mal que de bien à la société ?',
      sides: [{ label: 'Pour', pct: 71 }, { label: 'Contre', pct: 29 }],
      totalVotes: 891, comments: 143, time: 'Il y a 5h', category: 'Société',
    },
    {
      id: '3', author: 'Clara Fontaine', authorInitials: 'CF',
      authorColor: 'linear-gradient(135deg,#22c55e,#10b981)',
      question: 'Le télétravail doit-il devenir la norme pour tous les emplois tertiaires ?',
      sides: [{ label: 'Pour', pct: 44 }, { label: 'Contre', pct: 56 }],
      totalVotes: 215, comments: 38, time: 'Hier', category: 'Travail',
    },
  ];
}
