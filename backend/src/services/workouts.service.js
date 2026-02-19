const workoutsRepository = require('../repositories/workouts.repository');

module.exports = {
  newWorkout: workoutsRepository.newWorkout,
  getMyWorkouts: workoutsRepository.getMyWorkouts,
  getWorkoutsManager: workoutsRepository.getWorkoutsManager,
  getUserDashboard: workoutsRepository.getUserDashboard,
  getManagerDashboard: workoutsRepository.getManagerDashboard,
  deleteWorkout: workoutsRepository.deleteWorkout,
  updateWorkout: workoutsRepository.updateWorkout
};
