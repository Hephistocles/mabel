/**
 * Copyright (C) 2015  Mabel Ticketing 
 * GNU General Public License v2.0
 * https://github.com/mabelticketing/mabel/blob/master/LICENSE.txt
 */

angular.module('mabel.dash')
	.controller("DashController", DashController);

function DashController($scope, APICaller, User) {
	var vm = this;

	/*** DECLARATION ***/

	// display dots when loading
	vm.user = {name: "..."};

	// initialise scope vars
	vm.ticketsAvailable = [];
	vm.ticketsBooked    = [];
	vm.waitingListTickets = [];
	vm.changedTickets   = [];

	vm.totalValue     = 0;
	vm.confirmedValue = 0;
	vm.pendingValue   = 0;

	vm.waitingListLoading   = true;
	vm.ticketsBookedLoading = true;
	vm.billingLoading       = true;

	vm.cancelTicket        = cancelTicket;
	vm.cancelWaitingTicket = cancelWaitingTicket;
	// vm.saveTicket          = saveTicket;
	// vm.saveTickets         = saveTickets;
	// vm.setChanged          = setChanged;
	vm.nameChange = nameChange;
	// vm.clearStatus         = clearStatus;

	vm.saveBtnClass = "primary";

	/*** INITIAL ACTION ***/

	// APICaller.get('type', function(err, data) {
	// 	if (err) return console.log(err);
	// 	// assign response to tickets array
	// 	vm.ticketsAvailable = data;
	// 	vm.ticketsAvailableLoading = false;
	// });

	var userPromise = User.current();
	userPromise.init();
	userPromise.$promise.then(function(user) {
		
		vm.user = user;

		// tickets

		user.tickets().get().$promise.then(function(tickets) {
			
			// sort tickets associated with user
			for (var i=0; i<tickets.length; i++) {
				if (tickets[i].status === 'PENDING_WL') {
					vm.waitingListTickets.push(tickets[i]);
				} else if (tickets[i].status === 'CANCELLED'
					|| tickets[i].status === 'CANCELLED_WL'
					|| tickets[i].status === 'INVALID') {
					continue;
				} else {
					vm.ticketsBooked.push(tickets[i]);
				}
			}

			vm.ticketsBookedLoading = false;
			vm.waitingListLoading = false;

			updateTotal();

		}, function(err) {
			console.log(err);
		});

		// allowance

		user.allowance.get().$promise.then(function(allowance) {
			// TODO: do something with allowance
			console.log(allowance);
		}, function(err) {
			console.log(err);
		});


	});
	

	/*** FUNCTION DEFINITIONS ***/

	// TODO: settimeout in order to prevent loads of requests at once
	// TODO: some sort of notification that it worked... a tick maybe
	function nameChange(ticket) {
		// check if non-empty string
		if(ticket.guest_name && typeof ticket.guest_name === 'string' && ticket.guest_name.length > 0) {

			vm.user.ticket(ticket.id).update({
				guest_name: ticket.guest_name
			}).$promise.then(function() {
				console.log("name changed");
			}, function(err) {
				console.log(err);
			});
		}
	}

	function cancelTicket(ticket) {
		if (window.confirm("Do you really want to cancel this ticket?")) {

			vm.user.ticket(ticket.id).delete().$promise.then(function() {
				for (var i=0; i<vm.ticketsBooked.length; i++) {
					if (vm.ticketsBooked[i] === ticket) {
						// removes deleted ticket from array
						vm.ticketsBooked.splice(i, 1);
						break;
					}
				}
				updateTotal();

			}, function(err) {
				console.log(err);
			});

		}
	}

	function cancelWaitingTicket(ticket) {
		if (window.confirm("Do you really want to leave the waiting list?")) {

			vm.user.ticket(ticket.id).delete().$promise.then(function() {
				for (var i=0; i<vm.waitingListTickets.length; i++) {
					if (vm.waitingListTickets[i] === ticket) {
						// removes deleted ticket from array
						vm.waitingListTickets.splice(i, 1);
						break;
					}
				}
			}, function(err) {
				console.log(err);
			});
		}
	}

	function updateTotal() {
		vm.totalValue = 0;
		vm.pendingValue = 0;
		vm.confirmedValue = 0;
		for (var i = 0; i<vm.ticketsBooked.length; i++) {
			if (vm.ticketsBooked[i].status === 'PENDING') {
				vm.pendingValue += vm.ticketsBooked[i].transaction_value;
			} else if (vm.ticketsBooked[i].status === 'CONFIRMED' || vm.ticketsBooked[i].status === 'ADMITTED') {
				vm.confirmedValue += vm.ticketsBooked[i].transaction_value;
			}
			vm.totalValue += vm.ticketsBooked[i].transaction_value;
		}
		vm.billingLoading = false;
	}
}
