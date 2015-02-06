# 
# Schema for initialising the MySQL database
# 
# NB I have introduced foreign key dependencies, which means we have to create and delete in the right order
-- drop table if exists email_destination;
-- drop table if exists email;
-- drop table if exists transaction;
-- drop table if exists ticket;
-- drop table if exists group_payment_method_access;
-- drop table if exists payment_method;
-- drop table if exists group_access_right;
-- drop table if exists user_group_membership;
-- drop table if exists user_group;
-- drop table if exists user;
-- drop table if exists ticket_status;
-- drop table if exists ticket_type;
-- drop table if exists event;

### EVENTS ###

create table if not exists event (
	id int auto_increment not null,
	name varchar(100) not null,
	launch_time int not null,
	close_time int not null,
	group_assignment_url varchar(300),
	primary key (id)
);

### TICKET TYPES ###

create table if not exists ticket_type (
	id int auto_increment not null,
	name varchar(100) not null,
	price DECIMAL(5,2) not null,
	ticket_limit int not null,
	event_id int not null,
	primary key (id),
	FOREIGN KEY (event_id) REFERENCES event(id)
);

### TICKET STATUSES ###

create table if not exists ticket_status (
	id int auto_increment not null,
	name varchar(32) not null,
	primary key (id)
);

### USERS ###

create table if not exists user (
	id int auto_increment not null,
	name varchar(100) not null,
	email varchar(100) not null,
	crsid varchar(8),
	registration_time int not null,
	password_md5 varchar(100), # will be null for raven logins
	verification_code varchar(100), # emailed to new users if registered via mabel
	is_verified boolean not null DEFAULT 0,
	primary key (id),
	unique(email),
	unique(crsid)
);

### GROUPS ###

create table if not exists user_group (
	id int auto_increment not null,
	name varchar(100) not null,
	description varchar(1000),
	ticket_allowance int not null,
	primary key (id)
);

### GROUP MEMBERSHIPS ###

create table if not exists user_group_membership (
	id int auto_increment not null,
	user_id int not null,
	group_id int not null,
	primary key (id),
	FOREIGN KEY (group_id) REFERENCES user_group(id),
	FOREIGN KEY (user_id) REFERENCES user(id),
	unique(user_id, group_id)
);

### GROUP ACCESS RIGHTS ###

create table if not exists group_access_right (
	id int auto_increment not null,
	group_id int not null,
	ticket_type_id int not null,
	primary key (id),
	FOREIGN KEY (group_id) REFERENCES user_group(id),
	FOREIGN KEY (ticket_type_id) REFERENCES ticket_type(id),
	unique(group_id, ticket_type_id)
);

### PAYMENT METHODS ###

create table if not exists payment_method (
	id int auto_increment not null,
	name varchar(100) not null,
	description varchar(128),
	event_id int not null,
	ticket_limit int not null,
	primary key (id),
	FOREIGN KEY (event_id) REFERENCES event(id)
);

create table if not exists group_payment_method_access (
	id int auto_increment not null,
	group_id int not null,
	payment_method_id int not null,
	primary key (id),
	FOREIGN KEY (group_id) REFERENCES user_group(id),
	FOREIGN KEY (payment_method_id) REFERENCES payment_method(id),
	unique(group_id, payment_method_id)
);

### TICKET ###

create table if not exists ticket (
	id int auto_increment not null,
	user_id int not null,
	ticket_type_id int not null,
	guest_name varchar(100),
	status_id int not null,
	payment_method_id int not null,
	book_time int,
	primary key (id),
	FOREIGN KEY (user_id) REFERENCES user(id),
	FOREIGN KEY (ticket_type_id) REFERENCES ticket_type(id),
	FOREIGN KEY (payment_method_id) REFERENCES payment_method(id),
	FOREIGN KEY (status_id) REFERENCES ticket_status(id)
);

### WAITING LIST ###

create table if not exists waiting_list (
	id int auto_increment not null,
	user_id int not null,
	ticket_type_id int not null,
	payment_method_id int not null,
	book_time int,
	has_donation boolean not null DEFAULT 0,
	primary key (id),
	FOREIGN KEY (user_id) REFERENCES user(id),
	FOREIGN KEY (payment_method_id) REFERENCES payment_method(id),
	FOREIGN KEY (ticket_type_id) REFERENCES ticket_type(id)
);

### TRANSACTIONS ###

create table if not exists transaction (
	id int auto_increment not null,
	user_id int not null,
	value DECIMAL(6,2) not null,
	payment_method_id int not null,
	transaction_time int not null,
	notes text,
	primary key (id),
	FOREIGN KEY (user_id) REFERENCES user(id),
	FOREIGN KEY (payment_method_id) REFERENCES payment_method(id)
);


### MAIL LOGS ###

create table if not exists email (
	id int auto_increment not null,
	from_email varchar(100) not null,
	send_time int not null,
	message_content text not null,
	primary key (id)
);

create table if not exists email_destination (
	id int auto_increment not null,
	address varchar(100) not null,
	user int,
	email_id int not null,
	primary key (id),
	foreign key (email_id) references email(id)
);


### Useful Views ###
CREATE  OR REPLACE VIEW ticket_summary AS 
	SELECT 
		ticket_type.id id, 
		ticket_type.name name, 
		COUNT(*) sold, 
		ticket_type.ticket_limit ticket_limit, 
		ticket_type.ticket_limit-COUNT(*) available 
	FROM 
		ticket 
		JOIN 
			ticket_type 
		ON 
			ticket.ticket_type_id=ticket_type.id 
	GROUP BY ticket_type.id;

CREATE OR REPLACE VIEW waiting_list_summary AS 
	SELECT 
		ticket_type.id id, 
		ticket_type.name name, 
		COUNT(*) sold, 
		ticket_type.ticket_limit ticket_limit, 
		ticket_type.ticket_limit-COUNT(*) available 
	FROM 
		waiting_list 
		JOIN 
			ticket_type 
		ON 
			waiting_list.ticket_type_id=ticket_type.id 
	GROUP BY ticket_type.id;

CREATE OR REPLACE VIEW tickets_grouped_by_user AS 
	SELECT user_id, user.name name, GROUP_CONCAT(ticket.id ORDER BY ticket.id ASC SEPARATOR ', ') tickets
		FROM ticket
	JOIN user 
		ON user.id=user_id
		GROUP BY user_id; 

CREATE OR REPLACE VIEW transaction_with_tickets AS
	SELECT transaction.id id, value, payment_method.name payment_method, notes, tickets, transaction_time
	FROM transaction
	JOIN payment_method
		ON payment_method.id = payment_method_id
	JOIN 
		tickets_grouped_by_user
		ON tickets_grouped_by_user.user_id = transaction.user_id;
