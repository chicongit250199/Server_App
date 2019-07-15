const Boom = require('boom');
// const _ = require('lodash');
const moment = require('moment');
const Models = require('../../database/models/index');
const BaseService = require('../../base/BaseService');
// const PasswordUtils = require('../../services/password');
class EngineerService extends BaseService {
  constructor() {
    super(Models.Engineer);
  }

  // start GetOne
  async getOne(id) {
    try {
      const result = await Models.Engineer.query() // select skill
        .findById(id)
        .eager('skills(selectSkill)', {
          selectSkill: builder => {
            builder.select('skills.id', 'skills.name');
          }
        })
        .mergeEager(
          'teams(selectTeam)', // select Team
          {
            selectTeam: builder => {
              builder
                .joinRelation('projects')
                .select('teams.name as teamName', 'projects.name as projectName'); // select project
            }
          }
        )
        .select(
          'id',
          'firstName',
          'lastName',
          'englishName',
          'phoneNumber',
          'address',
          'birthday',
          'avatar',
          'salary',
          'dateIn',
          'email',
          'skype',
          'avatar',
          'expYear',
          'status'
        );
      const n = result.teams.length;
      result.totalProject = n;
      if (!result) {
        throw Boom.notFound(`Not found`);
      }
      return result;
    } catch (error) {
      throw error;
    }
  }

  // end GetOne
  async createOne(payload) {
    const { skills } = payload;
    delete payload.skills;
    payload.birthday = moment(payload.birthday);
    payload.dateIn = moment(payload.dateIn);
    payload.expYear = moment().diff(payload.dateIn, 'year', false);
    const engineer = await Models.Engineer.query().insert(payload);
    await engineer.$relatedQuery('skills').relate(skills);
    return engineer;
  }

  async updateOne(id, payload) {
    try {
      let skills = null;
      if (payload.skills) {
        /* eslint prefer-destructuring: ["error", {VariableDeclarator: {object: true}}] */
        skills = payload.skills;
        delete payload.skills;
      }
      if (payload.birthday) {
        payload.birthday = moment(payload.birthday);
      }
      if (payload.dateIn) {
        payload.dateIn = moment(payload.dateIn);
        payload.expYear = moment().diff(payload.dateIn, 'year', false);
      }
      if (payload.dateOut) {
        payload.dateOut = moment(payload.dateOut);
      }
      const engineer = await Models.Engineer.query().patchAndFetchById(id, payload);
      if (!engineer) {
        throw Boom.notFound(`Engineer is not found`);
      }
      if (skills) {
        await engineer.$relatedQuery('skills').unrelate();
        await engineer.$relatedQuery('skills').relate(skills);
        const skillList = await Models.Skill.query()
          .whereIn('id', skills)
          .select('id', 'name');
        engineer.skills = skillList;
      }
      return engineer;
    } catch (error) {
      throw error;
    }
  }

  // start delete (update deleteAt)
  async deleteOne(id) {
    try {
      const result = await Models.Engineer.query()
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
  // end delete
}
module.exports = EngineerService;
