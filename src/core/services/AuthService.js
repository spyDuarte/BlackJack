export class AuthService {
    constructor(game, supabaseClient) {
        this.game = game;
        this.supabase = supabaseClient;
    }

    setupAuthListener() {
        this.supabase.auth.onAuthStateChange((event, session) => {
            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
                this.onUserSignIn(session);
            } else if (event === 'SIGNED_OUT') {
                this.onUserSignOut();
            }
        });
    }

    onUserSignIn(session) {
        if (!session || !session.user) return;

        const user = session.user;
        this.game.userId = user.id;
        this.game.username = user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split('@')[0];

        this.game.loadGame();
        this.game.loadSettings();
        this.game.updateUI();

        if (this.game.ui) {
            this.game.ui.onLoginSuccess();
            this.game.ui.setAuthLoading(false);
        }
    }

    onUserSignOut() {
        this.game.userId = null;
        this.game.username = null;
        this.game.initializeGameState();

        if (this.game.ui) {
            this.game.ui.updateAuthUI();
            this.game.ui.showToast('Você saiu da conta. Jogando como visitante.', 'info');
            this.game.ui.showMessage('Escolha sua aposta!');
        }

        this.game.updateUI();
    }

    async logout() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            if (this.game.ui) this.game.ui.showMessage('Desconectado.', 'info');
        } catch (error) {
            console.error('Logout error', error);
        }
    }
}
