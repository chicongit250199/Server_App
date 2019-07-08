const Boom = require('boom');
// const _ = require('lodash');
const Models = require('../../database/models/index');
const BaseService = require('../../base/BaseService');

class TeamService extends BaseService {
  constructor() {
    super(Models.Team);
  }

  async getMany(query) {
    let builder = this.model
      .queryBuilder(query)
      .joinRelation('projects')
      .select(
        'teams.id',
        'teams.name as teamName',
        'projects.name as projectName',
        'teams.deletedAt'
      );

    if (this.getSearchQuery && query.q) {
      builder = this.getSearchQuery(builder, query.q);
    }
    return builder;
  }

  async getOne(id) {
    try {
      const engineerTeam = Models.EngineerTeam.query()
        .join('engineers', 'engineer_team.engineerId', 'engineers.id')
        .select('englishName', 'engineers.id')
        .where('teamId', id)
        .andWhere('role', 'leader')
        .first();

      const team = Models.Team.query()
        .findById(id)
        .joinRelation('projects')
        .select(
          'teams.id',
          'teams.name as teamName',
          'projects.name as projectName',
          'teams.createdAt',
          Models.Team.relatedQuery('engineers')
            .count()
            .as('totalMember')
        );

      const [leader, result] = await Promise.all([engineerTeam, team]);
      result.leader = leader;
      if (!result) {
        throw Boom.notFound(`Model Team is not found`);
      }
      return result;
    } catch (error) {
      throw error;
    }
  }

  async createOne(payload) {
    try {
      const { engineers } = payload;

      delete payload.engineers;
      const team = await Models.Team.query()
        .insert(payload)
        .returning('id');

      engineers.forEach(e => {
        e.engineerId = e.id;
        e.teamId = team.id;
        delete e.id;
      });

      await Models.EngineerTeam.query().insertGraph(engineers);

      return team;
    } catch (error) {
      throw error;
    }
  }

  async updateOne(id, payload) {
    try {
      const { engineers } = payload;
      delete payload.engineers;
      const team = await Models.Team.query().patchAndFetchById(id, payload);
      if (!team) {
        throw Boom.notFound(`Team is not found`);
      }
      engineers.forEach(e => {
        e.engineerId = e.id;
        e.teamId = id;
        delete e.id;
      });
      await Models.EngineerTeam.query()
        .where('teamId', id)
        .delete();

      await Models.EngineerTeam.query().insertGraph(engineers);
      return team;
    } catch (error) {
      throw error;
    }
  }

  async deleteOne(id) {
    try {
      const result = await Models.Team.query()
        .findById(id)
        .update({
          deletedAt: new Date()
        })
        .returning('id', 'deletedAt');
      if (!result) {
        throw Boom.notFound(`Not found`);
      }
      return result;
    } catch (error) {
      throw error;
    }
  }
}
module.exports = TeamService;
