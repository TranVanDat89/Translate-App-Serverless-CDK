import * as fs from 'fs';
import * as path from 'path';
import { getPath } from './path';

export interface AuthConfigData {
    userPoolId: string;
    userPoolClientId: string;
}

export function writeAuthConfigToFile(data: AuthConfigData) {
    const configDir = getPath("apps/frontend/src/environments");
  
    console.log('Writing config to:', configDir);
  
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  
    fs.writeFileSync(
      path.join(configDir, 'auth-config.json'),
      JSON.stringify(data, null, 2)
    );
  }