# Paycheck to Paycheck

Paycheck to Paycheck is an open-source web application designed to help individuals manage their bills efficiently. The
application allows users to track bill payments, due dates, auto-pay statuses, and other relevant details in an
organized way. You can also share bills with others, edit them directly from the table, and manage user access roles
such as Viewer or Editor.

## Features

- **Bill Management**: Easily manage bills, due dates, amounts, and payment statuses in one place.
- **Real-Time Editing**: Click any table cell to edit it, and the data is saved upon blur.
- **Sorting & Filtering**: Sort bills by any column (e.g., due date, amount, etc.) and toggle between ascending, descending, or neutral states.
- **Disable Bills**: Move bills between active and disabled states.
- **Share Documents**: Share bills with others by adding them as viewers or editors.
- **Document Management**: Each bill is part of a document, which can be managed, shared, or deleted.

## Getting Started

### Prerequisites
The following dependencies need to be installed on your machine

* **Node.js** (version 14.x or higher)
* **Firebase Account**: You need a Firebase project to set up Firestore and authentication.
* **Java**: Minimum version of Java 11 installed

1. Clone the repository:
```bash
git clone https://github.com/tuffant21/paycheck-to-paycheck.git
```

2. Navigate to the project directory:
```bash
cd paycheck-to-paycheck
```

3. Install the dependencies:
```bash
npm install
```

4.	Set up Firebase:

* Create a Firebase project at Firebase Console.
* Set up Firestore Database and Authentication.
* Replace the Firebase configuration in your `src/environments/environment.ts` file.

5. Run the app locally:
```bash
npm run emulators
npm run serve
```

## Contributing

Contributions are welcome! Feel free to fork this repository and submit pull requests. Please ensure that your contributions align with the project’s goals of simplicity and usability.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.

## Contact

* Creator: Anthony House
* LinkedIn: LinkedIn Profile
* Facebook: Facebook Profile
* Project Facebook Page: Paycheck to Paycheck

## Extra Notes
These are the commands I used to set up this environment from a brand new computer
```bash
# install git
sudo apt update
sudo apt upgrade -y
sudo apt install git -y

# configure git
git config --global user.email "MY_EMAIL"
git config --global user.name "MY_NAME"

# create ssh key for github
ssh-keygen -t ed25519 -C "MY_EMAIL"
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub # copy value to GitHub

# clone the repo
git clone git@github.com:tuffant21/paycheck-to-paycheck.git

# install nvm
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 20
node --version # verify version

# install java
sudo apt install openjdk-22-jre-headless
java -version # verify version

# install angular cli
npm install -g @angular/cli

# install firebase tools
npm install -g firebase-tools

# login
firebase login

# init
firebase init

# install dependencies
npm i

# start services
npm run emulators
npm run serve
```