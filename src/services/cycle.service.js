// ============================================
// ShroomSync — Cultivation Cycle Service
// ============================================

const prisma = require('../utils/prisma');
const { NotFoundError, ValidationError } = require('../utils/errors');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function round(value, digits = 3) {
  if (value == null || Number.isNaN(value)) return null;
  return Number(value.toFixed(digits));
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function dayStartUtc(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function daysBetweenInclusive(start, end) {
  const days = Math.floor((dayStartUtc(end) - dayStartUtc(start)) / MS_PER_DAY);
  return days < 0 ? 0 : days + 1;
}

function revenueForHarvest(harvest) {
  if (harvest.pricePerKg == null) return null;
  return harvest.weightKg * harvest.pricePerKg;
}

class CycleService {
  async _ensureDeviceExists(deviceId) {
    const device = await prisma.device.findUnique({
      where: { deviceId },
      select: { deviceId: true },
    });

    if (!device) {
      throw new NotFoundError(`Device "${deviceId}" not found`);
    }

    return device;
  }

  async _getCycleOrThrow(deviceId, cycleId, include = undefined) {
    const cycle = await prisma.cultivationCycle.findFirst({
      where: { id: cycleId, deviceId },
      ...(include && { include }),
    });

    if (!cycle) {
      throw new NotFoundError(`Cycle "${cycleId}" not found for device "${deviceId}"`);
    }

    return cycle;
  }

  async _getHarvestOrThrow(cycleId, harvestId) {
    const harvest = await prisma.harvestRecord.findFirst({
      where: { id: harvestId, cycleId },
    });

    if (!harvest) {
      throw new NotFoundError(`Harvest "${harvestId}" not found for this cycle`);
    }

    return harvest;
  }

  _validateCycleDates({ startedAt, expectedEndedAt, endedAt }) {
    if (expectedEndedAt && expectedEndedAt < startedAt) {
      throw new ValidationError('expectedEndedAt must be after startedAt');
    }

    if (endedAt && endedAt < startedAt) {
      throw new ValidationError('endedAt must be after startedAt');
    }
  }

  _validateHarvestDate(cycle, harvestedAt) {
    if (harvestedAt < cycle.startedAt) {
      throw new ValidationError('harvestedAt must be after cycle startedAt');
    }

    if (cycle.endedAt && harvestedAt > cycle.endedAt) {
      throw new ValidationError('harvestedAt must be before cycle endedAt');
    }
  }

  async listCycles(deviceId, { status, from, to, limit = 100, offset = 0 }) {
    await this._ensureDeviceExists(deviceId);

    const where = { deviceId };

    if (status) where.status = status;
    if (from || to) {
      where.startedAt = {};
      if (from) where.startedAt.gte = from;
      if (to) where.startedAt.lte = to;
    }

    const [records, total] = await Promise.all([
      prisma.cultivationCycle.findMany({
        where,
        include: { _count: { select: { harvests: true } } },
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.cultivationCycle.count({ where }),
    ]);

    return { records, total, limit, offset };
  }

  async createCycle(deviceId, data) {
    await this._ensureDeviceExists(deviceId);
    this._validateCycleDates(data);

    return prisma.cultivationCycle.create({
      data: {
        ...data,
        deviceId,
      },
      include: { _count: { select: { harvests: true } } },
    });
  }

  async getCycle(deviceId, cycleId) {
    return this._getCycleOrThrow(deviceId, cycleId, {
      _count: { select: { harvests: true } },
    });
  }

  async updateCycle(deviceId, cycleId, data) {
    const cycle = await this._getCycleOrThrow(deviceId, cycleId);
    const updateData = { ...data };

    if (updateData.status === 'completed' && updateData.endedAt === undefined && !cycle.endedAt) {
      updateData.endedAt = new Date();
    }

    if (updateData.status === 'active' && updateData.endedAt === undefined) {
      updateData.endedAt = null;
    }

    const startedAt = updateData.startedAt || cycle.startedAt;
    const expectedEndedAt = updateData.expectedEndedAt === undefined
      ? cycle.expectedEndedAt
      : updateData.expectedEndedAt;
    const endedAt = updateData.endedAt === undefined ? cycle.endedAt : updateData.endedAt;

    this._validateCycleDates({ startedAt, expectedEndedAt, endedAt });

    return prisma.cultivationCycle.update({
      where: { id: cycleId },
      data: updateData,
      include: { _count: { select: { harvests: true } } },
    });
  }

  async completeCycle(deviceId, cycleId, data) {
    return this.updateCycle(deviceId, cycleId, {
      status: 'completed',
      endedAt: data.endedAt,
      ...(data.notes !== undefined && { notes: data.notes }),
    });
  }

  async deleteCycle(deviceId, cycleId) {
    await this._getCycleOrThrow(deviceId, cycleId);
    await prisma.cultivationCycle.delete({ where: { id: cycleId } });
    return { deleted: true };
  }

  async listHarvests(deviceId, cycleId, { from, to, limit = 100, offset = 0 }) {
    await this._getCycleOrThrow(deviceId, cycleId);

    const where = { cycleId };

    if (from || to) {
      where.harvestedAt = {};
      if (from) where.harvestedAt.gte = from;
      if (to) where.harvestedAt.lte = to;
    }

    const [records, total] = await Promise.all([
      prisma.harvestRecord.findMany({
        where,
        orderBy: { harvestedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.harvestRecord.count({ where }),
    ]);

    return { records, total, limit, offset };
  }

  async addHarvest(deviceId, cycleId, data) {
    const cycle = await this._getCycleOrThrow(deviceId, cycleId);
    this._validateHarvestDate(cycle, data.harvestedAt);

    return prisma.harvestRecord.create({
      data: {
        ...data,
        cycleId,
      },
    });
  }

  async updateHarvest(deviceId, cycleId, harvestId, data) {
    const cycle = await this._getCycleOrThrow(deviceId, cycleId);
    const harvest = await this._getHarvestOrThrow(cycleId, harvestId);
    const harvestedAt = data.harvestedAt || harvest.harvestedAt;

    this._validateHarvestDate(cycle, harvestedAt);

    return prisma.harvestRecord.update({
      where: { id: harvestId },
      data,
    });
  }

  async deleteHarvest(deviceId, cycleId, harvestId) {
    await this._getCycleOrThrow(deviceId, cycleId);
    await this._getHarvestOrThrow(cycleId, harvestId);
    await prisma.harvestRecord.delete({ where: { id: harvestId } });
    return { deleted: true };
  }

  async getCycleSummary(deviceId, cycleId) {
    const cycle = await this._getCycleOrThrow(deviceId, cycleId, {
      harvests: { orderBy: { harvestedAt: 'asc' } },
      _count: { select: { harvests: true } },
    });

    const { harvests, ...cycleData } = cycle;
    const cycleEnd = cycle.endedAt || new Date();
    const cycleAgeDays = daysBetweenInclusive(cycle.startedAt, cycleEnd);
    const totalHarvests = harvests.length;
    const totalWeightKg = harvests.reduce((sum, harvest) => sum + harvest.weightKg, 0);

    let totalRevenue = 0;
    let pricedHarvests = 0;
    const daily = new Map();

    for (const harvest of harvests) {
      const key = dateKey(harvest.harvestedAt);
      const revenue = revenueForHarvest(harvest);
      const current = daily.get(key) || {
        date: key,
        harvestCount: 0,
        totalWeightKg: 0,
        totalRevenue: 0,
        pricedHarvests: 0,
      };

      current.harvestCount += 1;
      current.totalWeightKg += harvest.weightKg;

      if (revenue != null) {
        current.totalRevenue += revenue;
        current.pricedHarvests += 1;
        totalRevenue += revenue;
        pricedHarvests += 1;
      }

      daily.set(key, current);
    }

    const dailyBreakdown = Array.from(daily.values()).map((item) => ({
      date: item.date,
      harvestCount: item.harvestCount,
      totalWeightKg: round(item.totalWeightKg),
      totalRevenue: item.pricedHarvests > 0 ? round(item.totalRevenue, 2) : null,
    }));

    const peakHarvestDay = dailyBreakdown.reduce((peak, item) => {
      if (!peak || item.totalWeightKg > peak.totalWeightKg) return item;
      return peak;
    }, null);

    const firstHarvest = harvests[0] || null;
    const latestHarvest = harvests[harvests.length - 1] || null;
    const harvestDays = dailyBreakdown.length;

    return {
      cycle: cycleData,
      summary: {
        totalHarvests,
        totalWeightKg: round(totalWeightKg),
        totalRevenue: pricedHarvests > 0 ? round(totalRevenue, 2) : null,
        cycleAgeDays,
        harvestDays,
        averageWeightPerHarvestKg: totalHarvests > 0 ? round(totalWeightKg / totalHarvests) : null,
        averageWeightPerCycleDayKg: cycleAgeDays > 0 ? round(totalWeightKg / cycleAgeDays) : null,
        averageWeightPerHarvestDayKg: harvestDays > 0 ? round(totalWeightKg / harvestDays) : null,
        yieldPerBaglogKg: cycle.baglogCount > 0 ? round(totalWeightKg / cycle.baglogCount) : null,
        firstHarvestAt: firstHarvest ? firstHarvest.harvestedAt : null,
        latestHarvestAt: latestHarvest ? latestHarvest.harvestedAt : null,
        peakHarvestDay,
      },
      dailyBreakdown,
    };
  }
}

module.exports = new CycleService();
