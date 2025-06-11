# User Guide

**Please ensure the application is deployed, instructions in the deployment guide here:**
- [Deployment Guide](./deploymentGuide.md)

Once you have deployed the solution, the following user guide will help you navigate the functions available.

| Index    | Description |
| -------- | ------- |
| [Administrator View](#admin-view)  | How the Admnistrator views the project | 
| [Instructor View](#instructor-view)  | How the Instructor/Supervising Lawyer views the project |
| [Student View](#student-view)  | How the Student views the project |

## Administrator View
To sign up as an administrator, you need to sign up regularly first as a student:
![image](./media/create-account.png)

You then get a confirmation email to verify your email. Once you have a student account, to become an adminstrator, you need to change your user group with Cognito through the AWS Console:
![image](./media/user-pool.png)

After clicking the user pool of the project, navigate to "Users" on the left navigation bar and find your email:
![image](./media/users.png)

After clicking your email, you can add the 'admin' user group. Start by scrolling down to "Group memberships" and selecting "Add user to group"
![image](./media/add-user-group.png)
Select "admin" group from available options: 
![image](./media/select-admin.png)
Confirm that the user has been added to the admin group by checking the "group attributes" of the user:
![image](./media/admin-added.png)

Once the 'admin' user group is added, delete the 'student' user group:
![image](./media/delete-student.png)
![image](./media/admin-only.png)

Upon logging in as an administrator, they see the following home page:
![image](./media/admin-home-page.png)

Clicking the "ADD INSTRUCTOR" button opens a pop-up where the administrator can enter the email address of a user with an account to add them as an administrator:
![image](./media/admin-add-instructor.png)

The administrator can also click an instructor in the list which opens a pop-up of instructor details including their name, email and students they have been assigned to. 
![image](./media/admin-instructor-details.png)

From here, administrators can assign students to the instructor by selecting "Add Student" dropdown and selecting the Student to be assigned. 
![image](./media/admin-select-student.png)
Once selected, click on "Assign Student" and student will be assigned to Instructor. Once assigned, the student's name will appear under the Instructor details. To unassign a student click on the "x" mark next to the student's name :

![image](./media/admin-unassign-student.png)

In the "AI Settings" page, the administrator can set a daily message limit for each user which will alter how many times a user can send messages to the AI Assistant:
![image](./media/admin-message-limit.png)

In this page, the administrator can also edit the current system prompt and view previous system prompts which will be fed to the AI Assistant.
![image](./media/admin-system-prompt.png)

On the Waiver Page, the admin can update the waiver which will be shown to students upon first sign up:



## Instructor View
