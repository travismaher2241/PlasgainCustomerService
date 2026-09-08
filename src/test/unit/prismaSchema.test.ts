import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Prisma Schema Definition (Prompt 1.1)', () => {
  const schemaPath = path.resolve(process.cwd(), 'prisma/schema.prisma');
  const rootSchemaPath = path.resolve(process.cwd(), 'schema.prisma');

  it('provides valid schema.prisma files in both prisma/ and root directories', () => {
    expect(fs.existsSync(schemaPath)).toBe(true);
    expect(fs.existsSync(rootSchemaPath)).toBe(true);
  });

  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

  // Helper to extract a model's body
  const getModelBlock = (modelName: string): string => {
    const lines = schemaContent.split(/\r?\n/);
    const startIdx = lines.findIndex((l) => new RegExp(`^model\\s+${modelName}\\s+\\{`).test(l.trim()));
    if (startIdx === -1) {
      throw new Error(`Model ${modelName} not found in schema`);
    }
    const modelLines: string[] = [];
    for (let i = startIdx + 1; i < lines.length; i++) {
      if (lines[i].trim() === '}') break;
      modelLines.push(lines[i]);
    }
    return modelLines.join('\n');
  };

  describe('Task 1: Core CRM Entities', () => {
    const coreEntities = ['Account', 'Contact', 'Lead', 'Opportunity', 'Task', 'Activity'];

    coreEntities.forEach((modelName) => {
      it(`defines core model: ${modelName}`, () => {
        const block = getModelBlock(modelName);
        expect(block).toBeTruthy();
        expect(block).toMatch(/id\s+String\s+@id/);
      });
    });
  });

  describe('Task 2: Competitor Pricing & Notifications Modeling', () => {
    it('models CompetitorPricing with all required fields from JSON file store', () => {
      const block = getModelBlock('CompetitorPricing');
      expect(block).toMatch(/competitorName\s+String/);
      expect(block).toMatch(/competitorProduct\s+String/);
      expect(block).toMatch(/price\s+Float/);
      expect(block).toMatch(/currency\s+String/);
      expect(block).toMatch(/priceBasis\s+String/);
      expect(block).toMatch(/gstStatus\s+String/);
      expect(block).toMatch(/sourceType\s+String/);
      expect(block).toMatch(/observedDate\s+DateTime/);
      expect(block).toMatch(/account\s+Account/);
    });

    it('models CompetitorPricingAlert linked to CompetitorPricing and Account', () => {
      const block = getModelBlock('CompetitorPricingAlert');
      expect(block).toMatch(/pricingRecordId\s+String/);
      expect(block).toMatch(/pricingRecord\s+CompetitorPricing/);
      expect(block).toMatch(/accountId\s+String/);
      expect(block).toMatch(/account\s+Account/);
      expect(block).toMatch(/isRead\s+Boolean/);
    });

    it('models Notification from ServerNotification with linkView and linkId', () => {
      const block = getModelBlock('Notification');
      expect(block).toMatch(/title\s+String/);
      expect(block).toMatch(/message\s+String/);
      expect(block).toMatch(/type\s+String/);
      expect(block).toMatch(/isRead\s+Boolean/);
      expect(block).toMatch(/isArchived\s+Boolean/);
      expect(block).toMatch(/linkView\s+String\?/);
      expect(block).toMatch(/linkId\s+String\?/);
    });
  });

  describe('Task 3: Conversion of TypeScript Unions to Reference Tables', () => {
    const referenceTables = [
      'Pipeline',
      'PipelineStage',
      'LeadStatus',
      'LossReason',
      'TaskType',
      'Territory',
      'ContactRole'
    ];

    referenceTables.forEach((table) => {
      it(`defines reference table: ${table}`, () => {
        const block = getModelBlock(table);
        expect(block).toBeTruthy();
        expect(block).toMatch(/name\s+String/);
      });
    });

    it('Territory includes unique code and relations to Account and Lead', () => {
      const block = getModelBlock('Territory');
      expect(block).toMatch(/code\s+String\s+@unique/);
      expect(block).toMatch(/accounts\s+Account\[\]/);
      expect(block).toMatch(/leads\s+Lead\[\]/);
    });

    it('ContactRole includes unique code and relation to Contact', () => {
      const block = getModelBlock('ContactRole');
      expect(block).toMatch(/code\s+String\s+@unique/);
      expect(block).toMatch(/contacts\s+Contact\[\]/);
    });

    it('LeadStatus includes unique code, order, and relation to Lead', () => {
      const block = getModelBlock('LeadStatus');
      expect(block).toMatch(/code\s+String\s+@unique/);
      expect(block).toMatch(/order\s+Int/);
      expect(block).toMatch(/leads\s+Lead\[\]/);
    });

    it('LossReason includes unique code and relation to Opportunity', () => {
      const block = getModelBlock('LossReason');
      expect(block).toMatch(/code\s+String\s+@unique/);
      expect(block).toMatch(/opportunities\s+Opportunity\[\]/);
    });

    it('TaskType includes unique code and relation to Task', () => {
      const block = getModelBlock('TaskType');
      expect(block).toMatch(/code\s+String\s+@unique/);
      expect(block).toMatch(/tasks\s+Task\[\]/);
    });
  });

  describe('Task 4: Foreign Key Relationships', () => {
    it('Opportunity belongs to Account and references PipelineStage and Pipeline', () => {
      const oppBlock = getModelBlock('Opportunity');
      expect(oppBlock).toMatch(/accountId\s+String/);
      expect(oppBlock).toMatch(/account\s+Account\s+@relation/);
      expect(oppBlock).toMatch(/pipelineId\s+String/);
      expect(oppBlock).toMatch(/pipeline\s+Pipeline\s+@relation/);
      expect(oppBlock).toMatch(/stageId\s+String/);
      expect(oppBlock).toMatch(/stage\s+PipelineStage\s+@relation/);
      expect(oppBlock).toMatch(/primaryContactId\s+String\?/);
      expect(oppBlock).toMatch(/primaryContact\s+Contact\?\s+@relation/);
      expect(oppBlock).toMatch(/lossReasonId\s+String\?/);
      expect(oppBlock).toMatch(/lossReason\s+LossReason\?\s+@relation/);
    });

    it('Contact belongs to Account and optionally references ContactRole', () => {
      const contactBlock = getModelBlock('Contact');
      expect(contactBlock).toMatch(/accountId\s+String/);
      expect(contactBlock).toMatch(/account\s+Account\s+@relation/);
      expect(contactBlock).toMatch(/roleId\s+String\?/);
      expect(contactBlock).toMatch(/contactRole\s+ContactRole\?\s+@relation/);
    });

    it('Lead references LeadStatus, Territory, and conversion targets', () => {
      const leadBlock = getModelBlock('Lead');
      expect(leadBlock).toMatch(/statusId\s+String/);
      expect(leadBlock).toMatch(/status\s+LeadStatus\s+@relation/);
      expect(leadBlock).toMatch(/territoryId\s+String\?/);
      expect(leadBlock).toMatch(/territory\s+Territory\?\s+@relation/);
      expect(leadBlock).toMatch(/convertedAccountId\s+String\?/);
      expect(leadBlock).toMatch(/convertedAccount\s+Account\?\s+@relation/);
      expect(leadBlock).toMatch(/convertedOpportunityId\s+String\?/);
      expect(leadBlock).toMatch(/convertedOpportunity\s+Opportunity\?\s+@relation/);
    });

    it('Task references TaskType, Account, Contact, and Opportunity', () => {
      const taskBlock = getModelBlock('Task');
      expect(taskBlock).toMatch(/typeId\s+String\?/);
      expect(taskBlock).toMatch(/taskType\s+TaskType\?\s+@relation/);
      expect(taskBlock).toMatch(/accountId\s+String\?/);
      expect(taskBlock).toMatch(/account\s+Account\?\s+@relation/);
      expect(taskBlock).toMatch(/opportunityId\s+String\?/);
      expect(taskBlock).toMatch(/opportunity\s+Opportunity\?\s+@relation/);
    });
  });

  describe('Task 5: PipelineStage contains NO UI-specific styling classes', () => {
    it('PipelineStage excludes colorClass and contains only semantic identifiers', () => {
      const stageBlock = getModelBlock('PipelineStage');
      expect(stageBlock).not.toMatch(/colorClass/i);
      expect(stageBlock).not.toMatch(/tailwind/i);
      expect(stageBlock).not.toMatch(/bg-/i);
      expect(stageBlock).not.toMatch(/text-/i);

      // Verifies presence of semantic identifiers
      expect(stageBlock).toMatch(/name\s+String/);
      expect(stageBlock).toMatch(/code\s+String/);
      expect(stageBlock).toMatch(/order\s+Int/);
      expect(stageBlock).toMatch(/probability\s+Float/);
      expect(stageBlock).toMatch(/isWon\s+Boolean/);
      expect(stageBlock).toMatch(/isLost\s+Boolean/);
    });
  });

  describe('Task 6: Concurrency and Timestamps on All Primary Entities', () => {
    const primaryEntities = [
      'Account',
      'Contact',
      'Lead',
      'Opportunity',
      'Task',
      'Activity',
      'CompetitorPricing',
      'CompetitorPricingAlert',
      'Notification'
    ];

    primaryEntities.forEach((modelName) => {
      it(`${modelName} includes createdAt, updatedAt, and version Int @default(1)`, () => {
        const block = getModelBlock(modelName);
        expect(block).toMatch(/version\s+Int\s+@default\(1\)/);
        expect(block).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\)/);
        expect(block).toMatch(/updatedAt\s+DateTime\s+@updatedAt/);
      });
    });
  });
});
