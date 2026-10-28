import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './App';
import { installWebSchemeSync } from './src/theme';

// The existing server puts this hash in Web Push payloads (/#/c/{liga}/escalacao/{id}).
function rewriteLegacyHash(): void {
  if (typeof window === 'undefined' || !window.location) return;
  const hash = window.location.hash || '';
  const match = hash.match(/^#\/c\/([a-z0-9._]+)\/escalacao\/(\d+)$/);
  if (match) {
    window.history.replaceState(null, '', `/jogo/${match[1]}/${match[2]}`);
    return;
  }
  if (hash === '#/hoje') {
    window.history.replaceState(null, '', '/hoje');
    return;
  }
  if (hash === '#/favoritos') {
    window.history.replaceState(null, '', '/favoritos');
    return;
  }
  const competition = hash.match(/^#\/c\/([a-z0-9._]+)\/(tabela|resultados|proximos|artilheiros)$/);
  if (competition) window.history.replaceState(null, '', `/competicao/${competition[1]}`);
}

rewriteLegacyHash();
installWebSchemeSync();
registerRootComponent(App);
