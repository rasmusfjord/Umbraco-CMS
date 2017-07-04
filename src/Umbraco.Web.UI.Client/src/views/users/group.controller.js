(function () {
    "use strict";

    function UserGroupEditController($scope, $location, $routeParams, userGroupsResource, localizationService, contentEditingHelper) {

        var vm = this;
        var localizeSaving = localizationService.localize("general_saving");

        vm.page = {};
        vm.userGroup = {};
        vm.labels = {};

        vm.goToPage = goToPage;
        vm.openSectionPicker = openSectionPicker;
        vm.openContentPicker = openContentPicker;
        vm.openMediaPicker = openMediaPicker;
        vm.openUserPicker = openUserPicker;
        vm.removeSelectedItem = removeSelectedItem;
        vm.clearStartNode = clearStartNode;
        vm.save = save;
        vm.openGranularPermissionsPicker = openGranularPermissionsPicker;

        function init() {

            vm.loading = true;

            localizationService.localize("general_cancel").then(function (name) {
                vm.labels.cancel = name;
            });

            if ($routeParams.create) {
                // get user group scaffold
                userGroupsResource.getUserGroupScaffold().then(function (userGroup) {
                    vm.userGroup = userGroup;
                    setSectionIcon(vm.userGroup.sections);
                    makeBreadcrumbs();
                    vm.loading = false;
                });
            } else {
                // get user group
               userGroupsResource.getUserGroup($routeParams.id).then(function (userGroup) {
                   vm.userGroup = userGroup;
                   formatGranularPermissionSelection();
                    setSectionIcon(vm.userGroup.sections);
                    makeBreadcrumbs();
                    vm.loading = false;
                });
            }

        }

        function save() {
            vm.page.saveButtonState = "busy";

            contentEditingHelper.contentEditorPerformSave({
                statusMessage: localizeSaving,
                saveMethod: userGroupsResource.saveUserGroup,
                scope: $scope,
                content: vm.userGroup,
                // We do not redirect on failure for users - this is because it is not possible to actually save a user
                // when server side validation fails - as opposed to content where we are capable of saving the content
                // item if server side validation fails
                redirectOnFailure: false,
                rebindCallback: function (orignal, saved) { }
            }).then(function (saved) {

                vm.userGroup = saved;
                formatGranularPermissionSelection();
                setSectionIcon(vm.userGroup.sections);
                makeBreadcrumbs();
                vm.page.saveButtonState = "success";

            }, function (err) {
                vm.page.saveButtonState = "error";
            });
        }

        function goToPage(ancestor) {
            $location.path(ancestor.path).search("subview", ancestor.subView);
        }

        function openSectionPicker() {
            vm.sectionPicker = {
                title: "Select sections",
                view: "sectionpicker",
                selection: vm.userGroup.sections,
                closeButtonLabel: vm.labels.cancel,
                show: true,
                submit: function (model) {
                    vm.sectionPicker.show = false;
                    vm.sectionPicker = null;
                },
                close: function (oldModel) {
                    if (oldModel.selection) {
                        vm.userGroup.sections = oldModel.selection;
                    }
                    vm.sectionPicker.show = false;
                    vm.sectionPicker = null;
                }
            };
        }

        function openContentPicker() {
            vm.contentPicker = {
                title: "Select content start node",
                view: "contentpicker",
                hideSubmitButton: true,
                show: true,
                submit: function (model) {
                    if (model.selection) {
                        vm.userGroup.startContentId = model.selection[0];
                    }
                    vm.contentPicker.show = false;
                    vm.contentPicker = null;
                },
                close: function (oldModel) {
                    vm.contentPicker.show = false;
                    vm.contentPicker = null;
                }
            };
        }

        function openMediaPicker() {
            vm.contentPicker = {
                title: "Select media start node",
                view: "treepicker",
                section: "media",
                treeAlias: "media",
                entityType: "media",
                hideSubmitButton: true,
                show: true,
                submit: function (model) {
                    if (model.selection) {
                        vm.userGroup.startMediaId = model.selection[0];
                    }
                    vm.contentPicker.show = false;
                    vm.contentPicker = null;
                },
                close: function (oldModel) {
                    vm.contentPicker.show = false;
                    vm.contentPicker = null;
                }
            };
        }

        function openUserPicker() {
            vm.userPicker = {
                title: "Select users",
                view: "userpicker",
                selection: vm.userGroup.users,
                show: true,
                submit: function (model) {
                    vm.userPicker.show = false;
                    vm.userPicker = null;
                },
                close: function (oldModel) {
                    vm.userPicker.show = false;
                    vm.userPicker = null;
                }
            };
        }

        /**
         * The granular permissions structure gets returned from the server in the dictionary format with each key being the permission category
         * however the list to display the permissions isn't via the dictionary way so we need to format it
         */
        function formatGranularPermissionSelection() {
            angular.forEach(vm.userGroup.assignedPermissions, function (node) {
                formatGranularPermissionSelectionForNode(node);
            });
        }

        function formatGranularPermissionSelectionForNode(node) {
            //the dictionary is assigned via node.permissions we will reformat to node.allowedPermissions
            node.allowedPermissions = [];
            angular.forEach(node.permissions, function (permissions, key) {
                angular.forEach(permissions, function (p) {
                    if (p.checked) {
                        node.allowedPermissions.push(p);
                    }
                });
            });
        }

        function openGranularPermissionsPicker() {
            vm.contentPicker = {
                title: "Select node",
                view: "contentpicker",
                hideSubmitButton: true,
                show: true,
                submit: function (model) {
                    if (model.selection) {
                        var node = model.selection[0];
                        //check if this is already in our selection
                        var found = _.find(vm.userGroup.assignedPermissions, function(i) {
                            return i.id === node.id; 
                        });
                        node = found ? found : node;
                        setPermissionsForNode(node);
                    }
                },
                close: function (oldModel) {
                    vm.contentPicker.show = false;
                    vm.contentPicker = null;
                }
            };
        }

        function setPermissionsForNode(node) {

            //clone the current defaults to pass to the model
            if (!node.permissions) {
                node.permissions = angular.copy(vm.userGroup.defaultPermissions);    
            }

            vm.nodePermissions = {
                title: "Set permissions for " + node.name,
                view: "nodepermissions",
                node: node,
                show: true,
                submit: function (model) {

                    if (model && model.node && model.node.permissions) {

                        formatGranularPermissionSelectionForNode(node);

                        if (!vm.userGroup.assignedPermissions) {
                            vm.userGroup.assignedPermissions = [];
                        }

                        //check if this is already in our selection
                        var found = _.find(vm.userGroup.assignedPermissions, function (i) {
                            return i.id === node.id;
                        });
                        if (!found) {
                            vm.userGroup.assignedPermissions.push(node);    
                        }
                    }

                    // close node permisssions overlay
                    vm.nodePermissions.show = false;
                    vm.nodePermissions = null;
                    // close content picker overlay
                    vm.contentPicker.show = false;
                    vm.contentPicker = null;
                },
                close: function (oldModel) {
                    vm.nodePermissions.show = false;
                    vm.nodePermissions = null;
                }
            };
        }

        function removeSelectedItem(index, selection) {
            if (selection && selection.length > 0) {
                selection.splice(index, 1);
            }
        }

        function clearStartNode(type) {
            if (type === "content") {
                vm.userGroup.startContentId = null;
            } else if (type === "media") {
                vm.userGroup.startMediaId = null;
            }
        }

        function makeBreadcrumbs() {
            vm.breadcrumbs = [
                {
                    "name": "Groups",
                    "path": "/users/users/overview",
                    "subView": "groups"
                },
                {
                    "name": vm.userGroup.name
                }
            ];
        }

        function setSectionIcon(sections) {
            angular.forEach(sections, function (section) {
                section.icon = "icon-section " + section.cssclass;
            });
        }

        init();

    }

    angular.module("umbraco").controller("Umbraco.Editors.Users.GroupController", UserGroupEditController);

})();
