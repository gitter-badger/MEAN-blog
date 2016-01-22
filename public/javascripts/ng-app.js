define([
    'angular'
], function (angular) {
    'use strict';

var app = angular.module('myapp', ['UserValidation']);

angular.module('UserValidation', []).directive('validPasswordC', function () {
    return {
        require: 'ngModel',
        link: function (scope, elm, attrs, ctrl) {
            ctrl.$parsers.unshift(function (viewValue, $scope) {
                var noMatch = (viewValue !== scope.myForm.password.$viewValue);
                ctrl.$setValidity('noMatch', !noMatch);
            });
        }
    };
})

