const exercisesRepository = require('../repositories/exercises.repository');

module.exports = {
  addExercise: exercisesRepository.addExercise,
  getExercises: exercisesRepository.getExercises,
  deleteExercise: exercisesRepository.deleteExercise,
  updateExercise: exercisesRepository.updateExercise,
  getMovementSuggestions: exercisesRepository.getMovementSuggestions
};
