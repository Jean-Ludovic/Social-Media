import { Component } from '@angular/core';

@Component({
  selector: 'app-feed',
  imports: [],
  templateUrl: './feed.html',
  styleUrl: './feed.scss',
})
export class Feed {
  posts = [
    { id: '1', author: 'Alice Martin',  initials: 'AM', avatarColor: 'linear-gradient(135deg,#ec4899,#f43f5e)', time: 'Il y a 5 min',  content: '🔥 Débat incroyable ce soir sur l\'avenir de l\'IA dans la société. Qui est Pour, qui est Contre ?', likes: 42, comments: 8 },
    { id: '2', author: 'Bob Dupont',    initials: 'BD', avatarColor: 'linear-gradient(135deg,#3b82f6,#06b6d4)', time: 'Il y a 23 min', content: 'Nouvelle étude : 78% des gens préfèrent les discussions en ligne aux réunions physiques. Qu\'en pensez-vous ?', likes: 19, comments: 5 },
    { id: '3', author: 'Clara Fontaine',initials: 'CF', avatarColor: 'linear-gradient(135deg,#22c55e,#10b981)', time: 'Il y a 1h',    content: 'Mon premier live ce soir à 20h00 ! On discutera de l\'impact des réseaux sociaux sur la démocratie. Ne manquez pas ça ! 📺', likes: 87, comments: 23 },
    { id: '4', author: 'David Leclerc', initials: 'DL', avatarColor: 'linear-gradient(135deg,#f97316,#f59e0b)', time: 'Il y a 2h',    content: 'Merci à tous pour vos contributions au débat d\'hier. On a atteint 500 votes ! Résumé disponible dans les commentaires.', likes: 156, comments: 34 },
  ];
}
