import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly templateCache = new Map<
    string,
    HandlebarsTemplateDelegate
  >();
  private readonly templateDir: string;

  constructor() {
    this.templateDir = this.resolveTemplateDir();
    this.logger.log(`Template directory resolved to: ${this.templateDir}`);
    this.registerPartials();
  }

  private resolveTemplateDir(): string {
    const possiblePaths = [
      path.join(__dirname, 'templates'),
      path.join(
        __dirname,
        '..',
        '..',
        '..',
        'modules',
        'notifications',
        'templates',
      ),
      path.join(process.cwd(), 'dist/modules/notifications/templates'),
      path.join(process.cwd(), 'src/modules/notifications/templates'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // Default fallback
    return path.join(__dirname, 'templates');
  }

  private registerPartials() {
    try {
      const layoutPath = path.join(this.templateDir, 'email', 'layout.hbs');
      if (fs.existsSync(layoutPath)) {
        const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
        handlebars.registerPartial('layout', layoutContent);
        this.logger.log('Registered email layout partial');
      }
    } catch (error) {
      this.logger.warn('Failed to register email layout partial', error);
    }
  }

  getTemplate(
    name: string,
    type: 'email' | 'sms',
    format: 'html' | 'txt' = 'html',
  ): HandlebarsTemplateDelegate {
    const templateKey = `${type}/${name}.${format}.hbs`;

    // Return cached template if available (in production)
    if (
      process.env.NODE_ENV === 'production' &&
      this.templateCache.has(templateKey)
    ) {
      return this.templateCache.get(templateKey)!;
    }

    try {
      const filePath = path.join(
        this.templateDir,
        type,
        `${name}.${format}.hbs`,
      );
      const templateContent = fs.readFileSync(filePath, 'utf-8');
      const compiledTemplate = handlebars.compile(templateContent);

      if (process.env.NODE_ENV === 'production') {
        this.templateCache.set(templateKey, compiledTemplate);
      }

      return compiledTemplate;
    } catch (error) {
      this.logger.error(`Error loading template: ${templateKey}`, error);
      throw new Error(`Template not found: ${templateKey}`);
    }
  }

  render(
    name: string,
    type: 'email' | 'sms',
    data: Record<string, unknown>,
    format: 'html' | 'txt' = 'html',
  ): string {
    const template = this.getTemplate(name, type, format);
    return template(data);
  }
}
